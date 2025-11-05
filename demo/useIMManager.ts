// // composables/useIMManager.ts
// import TencentCloudChat, { ChatSDK, Message } from '@tencentcloud/chat'
// import TIMUploadPlugin from 'tim-upload-plugin'
// import EventEmitter from 'eventemitter3'
// import { IMEventType } from '@/constants/im'
// import { genTestUserSig } from '@/composables/rtm/generate-test-user-sig.ts'
// import { ref, computed, readonly } from 'vue'
// import { onMounted, onUnmounted } from 'vue'

const SDKAppID = 1600090472

// 自定义错误类型
export class IMError extends Error {
	public code: string
	public details?: any

	constructor(message: string, code: string, details?: any) {
		super(message)
		this.name = 'IMError'
		this.code = code
		this.details = details
	}
}

// 连接状态枚举
export enum ConnectionState {
	DISCONNECTED = 'disconnected',
	CONNECTING = 'connecting',
	CONNECTED = 'connected',
	RECONNECTING = 'reconnecting',
	ERROR = 'error',
}

// 网络状态枚举
export enum NetworkState {
	UNKNOWN = 'unknown',
	WIFI = 'wifi',
	MOBILE = 'mobile',
	NONE = 'none',
}

export interface IMUserInfo {
	userID: string
}

export interface IMManagerOptions {
	SDKAppID: number
	userID: string
	userSig: string
}

export interface HistoryMessageOptions {
	conversationID: string
	nextReqMessageID?: string
}

export type IMEventTypeValue =
	| (typeof IMEventType)[Exclude<keyof typeof IMEventType, 'CMD'>]
	| (typeof IMEventType.CMD)[keyof typeof IMEventType.CMD]

const LOG_PRIFIX = '[🛰️ IMManager]'

type HandlerRecord = {
	eventType: IMEventTypeValue
	handler: (...args: any[]) => void
}

// 撤回消息事件数据接口
export interface RevokedMessageData {
	conversationID: string
	ID: string
	revoker: string
	revokeReason: string
	revokerInfo: {
		userID: string
		nick: string
		avatar: string
	}
	sequence: number
}

// 撤回消息事件接口
export interface MessageRevokedEvent {
	name: string
	data: RevokedMessageData[]
}

// 状态接口定义
export interface IMState {
	connectionState: ConnectionState // 连接状态
	networkState: NetworkState // 网络状态
	isReady: boolean // SDK是否就绪
	isLoggedIn: boolean // 是否已登录
	errorCount: number // 错误计数
	reconnectAttempts: number // 重连次数
	lastHeartbeat: number // 最后心跳时间
	timestamp: number // 状态更新时间
}

// 群组权限枚举
export enum GroupRole {
	OWNER = 'Owner', // 群主
	ADMIN = 'Admin', // 管理员
	MEMBER = 'Member', // 普通成员
}

// 群组操作权限接口
export interface GroupOperationPermissions {
	kickMember: boolean
	addMember: boolean
	deleteMessage: boolean
	editGroupInfo: boolean
	inviteMember: boolean
}

// 踢人操作结果接口
export interface KickMemberResult {
	success: boolean
	message: string
	errorCode?: number
	details?: any
}

// 群组信息接口
export interface GroupInfo {
	groupID: string
	name: string
	ownerID: string
	memberCount: number
	maxMemberCount: number
	type: string
	introduction?: string
	notification?: string
	faceURL?: string
	groupCustomField?: any[]
	muteAllMembers?: boolean
	admins?: string[]
	members?: any[]
}

// 修改角色操作结果接口
export interface SetGroupMemberRoleResult {
	success: boolean
	message: string
	errorCode?: number
	details?: any
}

// 角色修改操作类型
export enum RoleOperation {
	SET_ADMIN = 'set_admin', // 设置为管理员
	REMOVE_ADMIN = 'remove_admin', // 取消管理员
}

// 解散群组操作结果接口
export interface DismissGroupResult {
	success: boolean
	message: string
	errorCode?: number
	details?: any
}

export class IMManager {
	public chat: ChatSDK // 腾讯云IM实例
	private ready: boolean = false // SDK是否就绪
	private emitter: EventEmitter // 事件发射器
	private joinedGroups: Set<string> // 已加入群组集合
	private static chatInstance: IMManager // 单例模式
	private handlerRecords: HandlerRecord[] = [] // 事件处理器记录
	private isUserLoggedIn: boolean = false // 是否已登录
	private currentUserID: string | null = null // 当前用户ID

	// 状态监控相关属性
	private connectionState: ConnectionState = ConnectionState.DISCONNECTED // 连接状态
	private networkState: NetworkState = NetworkState.UNKNOWN // 网络状态
	private lastHeartbeat: number = 0 // 最后心跳时间
	private heartbeatInterval: number | null | NodeJS.Timeout = null // 心跳检查间隔
	private reconnectAttempts: number = 0 // 重连次数
	private maxReconnectAttempts: number = 5 // 最大重连次数
	private reconnectDelay: number = 1000 // 重连延迟
	private healthCheckInterval: number | null | NodeJS.Timeout = null // 健康检查间隔
	private errorCount: number = 0 // 错误计数
	private maxErrorCount: number = 10 // 最大错误计数
	private errorWindow: number = 60000 // 1分钟内的错误计数窗口 错误计数窗口

	// 状态对象和回调
	private state: IMState
	private stateChangeCallback: ((state: IMState) => void) | null = null

	constructor() {
		try {
			// @ts-ignore
			// 创建腾讯云IM实例
			this.chat = TencentCloudChat.create({ SDKAppID, unlimitedAVChatRoom: true })
			// 设置日志级别
			this.chat.setLogLevel(0)
			// 注册上传插件
			this.chat.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin })

			// 初始化状态对象
			this.state = this.createInitialState()

			// 注册事件监听器
			this.registerEventListeners()
			// 创建事件发射器
			this.emitter = new EventEmitter()
			// 创建已加入群组集合
			this.joinedGroups = new Set()

			// 启动健康检查
			this.startHealthCheck()
		} catch (error) {
			console.error(LOG_PRIFIX, 'IM SDK 初始化失败:', error)
			throw new IMError('IM SDK 初始化失败', 'INIT_FAILED', error)
		}
	}

	// 创建初始状态
	private createInitialState(): IMState {
		return {
			connectionState: this.connectionState,
			networkState: this.networkState,
			isReady: this.ready,
			isLoggedIn: this.isUserLoggedIn,
			errorCount: this.errorCount,
			reconnectAttempts: this.reconnectAttempts,
			lastHeartbeat: this.lastHeartbeat,
			timestamp: Date.now(),
		}
	}
	//检查是否ready
	public isReady(): boolean {
		return this.ready
	}

	// 更新状态并触发回调
	private updateState(updates: Partial<IMState>): void {
		const previousState = { ...this.state }
		this.ready = this.connectionState === ConnectionState.CONNECTED && this.isUserLoggedIn
		this.state = { ...this.state, ...updates, timestamp: Date.now(), isReady: this.ready }
		console.log(LOG_PRIFIX, '更新状态:', this.state)
		// 触发状态变化回调
		if (this.stateChangeCallback) {
			this.stateChangeCallback(this.state)
		}

		// 记录状态变化日志
		const changedKeys = Object.keys(updates).filter(
			key => previousState[key as keyof IMState] !== this.state[key as keyof IMState],
		)
		if (changedKeys.length > 0) {
			console.log(LOG_PRIFIX, `状态变化: ${changedKeys.join(', ')}`, {
				previous: previousState,
				current: this.state,
			})
		}
	}

	// 设置状态变化回调
	public onStateChange(callback: (state: IMState) => void): void {
		this.stateChangeCallback = callback
		// 立即触发一次回调，提供当前状态
		callback(this.state)
	}

	// 获取当前状态
	public getState(): IMState {
		return { ...this.state }
	}

	// 注册所有事件监听器
	private registerEventListeners(): void {
		// 基础事件监听
		this.chat.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, this.handleMessageReceived.bind(this))
		this.chat.on(TencentCloudChat.EVENT.SDK_READY, this.handleSDKReady.bind(this))
		this.chat.on(TencentCloudChat.EVENT.MESSAGE_REVOKED, (revokedMessage: MessageRevokedEvent) => {
			this.emitter.emit(IMEventType.MSG_REVOKED, revokedMessage.data)
		})

		// 网络状态监控
		this.chat.on(TencentCloudChat.EVENT.NET_STATE_CHANGE, this.handleNetworkStateChanged.bind(this))

		// 错误事件监控
		this.chat.on(TencentCloudChat.EVENT.ERROR, this.handleError.bind(this))
		this.chat.on(TencentCloudChat.EVENT.KICKED_OUT, this.handleKickedOut.bind(this))

		// 群组相关事件
		this.chat.on(TencentCloudChat.EVENT.GROUP_ATTRIBUTES_UPDATED, this.handleGroupAttributesUpdated.bind(this))
	}

	// 处理 SDK 就绪事件
	private handleSDKReady(): void {
		this.connectionState = ConnectionState.CONNECTED
		this.reconnectAttempts = 0
		this.errorCount = 0
		console.log(LOG_PRIFIX, 'IM SDK 已准备就绪')

		// 更新状态
		this.updateState({
			connectionState: ConnectionState.CONNECTED,
			reconnectAttempts: 0,
			errorCount: 0,
		})

		this.emitter.emit(IMEventType.SDK_READY)
	}

	/**
	 * 处理网络状态变化
	 * @param event 网络状态变化事件
	 * @returns void
	 */
	private handleNetworkStateChanged(event: any): void {
		const { state } = event.data
		const previousState = this.networkState // 之前网络状态
		const previousConnectionState = this.connectionState // 之前连接状态

		// 使用腾讯云IM的网络状态常量 根据网络状态更新连接状态
		switch (state) {
			case TencentCloudChat.TYPES.NET_STATE_CONNECTED: // 网络已连接
				this.networkState = NetworkState.WIFI // 连接状态通常表示网络正常
				this.connectionState = ConnectionState.CONNECTED
				this.reconnectAttempts = 0 // 重连次数重置
				this.errorCount = 0 // 错误计数重置
				console.log(LOG_PRIFIX, 'IM 网络已连接')
				break
			case TencentCloudChat.TYPES.NET_STATE_CONNECTING: // 网络正在连接
				this.networkState = NetworkState.MOBILE // 连接中可能表示网络不稳定
				this.connectionState = ConnectionState.CONNECTING
				console.log(LOG_PRIFIX, 'IM 网络正在连接...')
				break
			case TencentCloudChat.TYPES.NET_STATE_DISCONNECTED: // 网络已断开
				this.networkState = NetworkState.NONE // 网络状态为未知
				this.connectionState = ConnectionState.DISCONNECTED // 连接状态为断开
				console.warn(LOG_PRIFIX, 'IM 网络已断开')
				this.handleDisconnection() // 处理连接断开
				break
			default:
				this.networkState = NetworkState.UNKNOWN // 网络状态为未知
				this.connectionState = ConnectionState.ERROR // 连接状态为异常
				console.error(LOG_PRIFIX, 'IM 网络状态异常:', state)
		}

		console.log(LOG_PRIFIX, `网络状态变化: ${previousState} -> ${this.networkState}`)
		console.log(LOG_PRIFIX, `连接状态变化: ${previousConnectionState} -> ${this.connectionState}`)

		// 更新状态
		this.updateState({
			networkState: this.networkState,
			connectionState: this.connectionState,
			reconnectAttempts: this.reconnectAttempts,
			errorCount: this.errorCount,
		})

		// 触发网络状态变化事件
		this.emitter.emit(IMEventType.NETWORK_STATE_CHANGED, {
			previousState,
			currentState: this.networkState,
		})

		// 触发连接状态变化事件
		this.emitter.emit(IMEventType.CONNECTION_STATE_CHANGED, {
			previousState: previousConnectionState,
			currentState: this.connectionState,
			reconnectAttempts: this.reconnectAttempts,
		})
	}

	// 处理错误事件
	private handleError(event: any): void {
		const error = event.data
		this.errorCount++

		console.error(LOG_PRIFIX, 'IM 发生错误:', error)

		// 更新状态
		this.updateState({
			errorCount: this.errorCount,
		})

		// 触发错误事件
		this.emitter.emit(IMEventType.ERROR, {
			error,
			errorCount: this.errorCount,
			connectionState: this.connectionState,
			networkState: this.networkState,
		})

		// 如果错误次数过多，可能需要重新连接
		if (this.errorCount >= this.maxErrorCount) {
			console.warn(LOG_PRIFIX, `错误次数过多 (${this.errorCount})，考虑重新连接`)
			this.emitter.emit(IMEventType.ERROR_THRESHOLD_EXCEEDED, {
				errorCount: this.errorCount,
				maxErrorCount: this.maxErrorCount,
			})
		}
	}

	// 处理被踢出事件
	private handleKickedOut(event: any): void {
		const { reason } = event.data
		console.warn(LOG_PRIFIX, 'IM 用户被踢出:', reason)

		this.isUserLoggedIn = false
		this.connectionState = ConnectionState.DISCONNECTED

		// 更新状态
		this.updateState({
			isLoggedIn: false,
			connectionState: ConnectionState.DISCONNECTED,
		})

		// 触发被踢出事件
		this.emitter.emit(IMEventType.KICKED_OUT, { reason })
	}

	// 处理超时事件 - 这个事件在腾讯云IM中可能不存在，暂时注释掉
	// private handleTimeout(event: any): void {
	//     console.warn(LOG_PRIFIX, 'IM 操作超时:', event.data)
	//
	//     // 触发超时事件
	//     this.emitter.emit('timeout', event.data)
	// }

	// 处理消息发送成功 - 这个事件在腾讯云IM中可能不存在，暂时注释掉
	// private handleMessageSent(event: any): void {
	//     const message = event.data
	//     console.log(LOG_PRIFIX, '消息发送成功:', message.ID)
	//
	//     // 触发消息发送成功事件
	//     this.emitter.emit('messageSent', message)
	// }

	// 处理消息发送失败 - 这个事件在腾讯云IM中可能不存在，暂时注释掉
	// private handleMessageSendFailed(event: any): void {
	//     const { message, error } = event.data
	//     console.error(LOG_PRIFIX, '消息发送失败:', message.ID, error)
	//
	//     // 触发消息发送失败事件
	//     this.emitter.emit('messageSendFailed', { message, error })
	// }

	// 处理群组系统通知 - 这个事件在腾讯云IM中可能不存在，暂时注释掉
	// private handleGroupSystemNotice(event: any): void {
	//     const notice = event.data
	//     console.log(LOG_PRIFIX, '收到群组系统通知:', notice)
	//
	//     // 触发群组系统通知事件
	//     this.emitter.emit('groupSystemNotice', notice)
	// }

	// 处理群组属性更新
	private handleGroupAttributesUpdated(event: any): void {
		const { groupID, groupAttributes } = event.data
		console.log(LOG_PRIFIX, '群组属性已更新:', groupID, groupAttributes)

		// 触发群组属性更新事件
		this.emitter.emit(IMEventType.GROUP_ATTRIBUTES_UPDATED, { groupID, groupAttributes })
	}

	// 处理连接断开
	private handleDisconnection(): void {
		console.warn(LOG_PRIFIX, 'IM 连接断开，尝试重连...')

		// 如果重连次数未超过限制，尝试重连
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			setTimeout(() => {
				this.attemptReconnect()
			}, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)) // 指数退避
		} else {
			console.error(LOG_PRIFIX, `重连次数已达上限 (${this.maxReconnectAttempts})，停止重连`)
			this.emitter.emit(IMEventType.MAX_RECONNECT_ATTEMPTS_REACHED, {
				reconnectAttempts: this.reconnectAttempts,
				maxReconnectAttempts: this.maxReconnectAttempts,
			})
		}
	}

	// 尝试重连
	private async attemptReconnect(): Promise<void> {
		try {
			this.reconnectAttempts++
			console.log(LOG_PRIFIX, `尝试第 ${this.reconnectAttempts} 次重连...`)

			// 更新状态
			this.updateState({
				reconnectAttempts: this.reconnectAttempts,
				connectionState: ConnectionState.RECONNECTING,
			})

			// 如果用户已登录，尝试重新登录
			if (this.isUserLoggedIn) {
				// 这里需要重新获取用户ID，可能需要从外部传入
				// 暂时跳过重新登录逻辑
				console.log(LOG_PRIFIX, '用户已登录，等待自动重连...')
			}
		} catch (error) {
			console.error(LOG_PRIFIX, '重连失败:', error)
		}
	}

	/**
	 * 启动健康检查
	 * @returns void
	 */
	private startHealthCheck(): void {
		// 心跳检查 每30秒检查一次
		this.heartbeatInterval = setInterval(() => {
			this.performHeartbeat()
		}, 30000) // 每30秒检查一次

		// 健康状态检查 每60秒检查一次
		this.healthCheckInterval = setInterval(() => {
			this.performHealthCheck()
		}, 60000) // 每60秒检查一次

		// 错误计数重置 每1分钟重置一次
		setInterval(() => {
			this.errorCount = 0
		}, this.errorWindow)
	}

	/**
	 * 执行心跳检查
	 * @returns void
	 */
	private performHeartbeat(): void {
		const now = Date.now()
		this.lastHeartbeat = now // 更新最后心跳时间

		// 更新状态
		this.updateState({
			lastHeartbeat: now,
		})

		// 检查连接状态
		if (this.connectionState !== ConnectionState.CONNECTED) {
			console.warn(LOG_PRIFIX, '心跳检查：连接状态异常', this.connectionState)
		}

		// 触发心跳事件
		this.emitter.emit(IMEventType.HEARTBEAT, {
			timestamp: now,
			connectionState: this.connectionState,
			networkState: this.networkState,
		})
	}

	// 执行健康检查
	private performHealthCheck(): void {
		const healthStatus = {
			connectionState: this.connectionState,
			networkState: this.networkState,
			isReady: this.ready,
			isLoggedIn: this.isUserLoggedIn,
			errorCount: this.errorCount,
			reconnectAttempts: this.reconnectAttempts,
			lastHeartbeat: this.lastHeartbeat,
			timestamp: Date.now(),
		}

		console.log(LOG_PRIFIX, '健康检查状态:', healthStatus)

		// 触发健康检查事件
		this.emitter.emit(IMEventType.HEALTH_CHECK, healthStatus)

		// 如果状态异常，触发警告
		if (this.connectionState === ConnectionState.ERROR || this.errorCount > this.maxErrorCount / 2) {
			this.emitter.emit(IMEventType.HEALTH_WARNING, healthStatus)
		}
	}

	// 清理资源
	private cleanup(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval)
			this.heartbeatInterval = null
		}

		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval)
			this.healthCheckInterval = null
		}
	}

	/**
	 * 获取IMManager实例
	 * @returns IMManager实例
	 */
	public static getInstance(): IMManager {
		if (!this.chatInstance) {
			this.chatInstance = new IMManager()
		}
		return this.chatInstance
	}

	// 参数验证工具方法
	private validateNotEmpty(str: string): void {
		if (!str || typeof str !== 'string' || str.trim().length === 0) {
			throw new IMError('参数不能为空', 'INVALID_PARAMS_EMPTY', { str })
		}
	}

	private validateGroupID(groupID: string): void {
		if (!groupID || typeof groupID !== 'string' || groupID.trim().length === 0) {
			throw new IMError('群组ID不能为空', 'INVALID_GROUP_ID', { groupID })
		}
	}

	private validateConversationID(conversationID: string): void {
		if (!conversationID || typeof conversationID !== 'string' || conversationID.trim().length === 0) {
			throw new IMError('会话ID不能为空', 'INVALID_CONVERSATION_ID', { conversationID })
		}
	}

	/**
	 * 登录
	 * @param userID 用户ID
	 * @param userSig 用户签名
	 * @returns void
	 */
	async login(userID: string, userSig: string): Promise<void> {
		try {
			// 验证用户ID和用户签名不能为空
			this.validateNotEmpty(userID)
			this.validateNotEmpty(userSig)

			if (this.isUserLoggedIn) {
				console.log(LOG_PRIFIX, 'IM 已经登录')
				return
			}

			// const userSig = genTestUserSig(userID)
			// console.log(LOG_PRIFIX, 'IM 登录中...')
			// 登录
			await this.chat.login({ userID, userSig })
			this.isUserLoggedIn = true // 设置为已登录
			this.currentUserID = userID // 设置当前用户ID

			// 更新状态
			this.updateState({
				isLoggedIn: true,
			})

			console.log(LOG_PRIFIX, 'IM 登录成功')
		} catch (error) {
			this.isUserLoggedIn = false
			this.currentUserID = null

			// 更新状态
			this.updateState({
				isLoggedIn: false,
			})

			console.error(LOG_PRIFIX, 'IM 登录失败:', error)

			if (error instanceof IMError) {
				throw error
			}

			// 处理腾讯云IM的错误码
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = (error as any).code
				let message = '登录失败'

				switch (errorCode) {
					case 7001:
						message = '用户签名错误'
						break
					case 7002:
						message = '用户ID格式错误'
						break
					case 7003:
						message = '用户已登录'
						break
					case 7004:
						message = '网络连接失败'
						break
					default:
						message = `登录失败: ${errorCode}`
				}

				throw new IMError(message, 'LOGIN_FAILED', error)
			}

			throw new IMError('登录失败', 'LOGIN_FAILED', error)
		}
	}

	/**
	 * 登出
	 * @returns void
	 */
	async logout(): Promise<void> {
		if (!this.isUserLoggedIn) {
			console.log(LOG_PRIFIX, 'IM 未登录，无需登出')
			return
		}

		try {
			// 清理已加入群组
			this.joinedGroups.clear()
			// 执行登出
			await this.chat.logout()

			// 更新状态
			this.isUserLoggedIn = false
			this.currentUserID = null
			this.connectionState = ConnectionState.DISCONNECTED

			// 更新状态
			this.updateState({
				isLoggedIn: false,
				connectionState: ConnectionState.DISCONNECTED,
			})

			console.log(LOG_PRIFIX, 'IM 退出成功')
		} catch (error) {
			console.error(LOG_PRIFIX, 'IM 退出失败:', error)
			this.isUserLoggedIn = false
			this.currentUserID = null

			// 更新状态
			this.updateState({
				isLoggedIn: false,
			})

			if (error instanceof IMError) {
				throw error
			}

			throw new IMError('退出失败', 'LOGOUT_FAILED', error)
		}
	}

	/**
	 * 创建群组
	 * @param groupID 群组ID
	 * @returns 群组信息
	 */
	public async createGroup(groupID: string): Promise<any> {
		try {
			// 验证群组ID不能为空
			this.validateGroupID(groupID)
			// 确认SDK是否就绪
			this.confirmReady()

			// 创建群组
			const group = await this.chat.createGroup({
				type: TencentCloudChat.TYPES.GRP_AVCHATROOM,
				name: groupID,
				isSupportTopic: true,
				groupID,
			})
			console.log(LOG_PRIFIX, '直播群组创建成功', group)
			return group
		} catch (error) {
			console.error(LOG_PRIFIX, '创建群组失败:', error)

			if (error instanceof IMError) {
				throw error
			}

			// 处理腾讯云IM的错误码
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = (error as any).code
				let message = '创建群组失败'

				switch (errorCode) {
					case 10013:
						message = '群组已存在'
						break
					case 10014:
						message = '群组ID格式错误'
						break
					case 10015:
						message = '群组名称过长'
						break
					default:
						message = `创建群组失败: ${errorCode}`
				}

				throw new IMError(message, 'CREATE_GROUP_FAILED', error)
			}

			throw new IMError('创建群组失败', 'CREATE_GROUP_FAILED', error)
		}
	}

	/**
	 * 处理收到消息事件
	 * @param event 收到消息事件
	 * @returns void
	 */
	private handleMessageReceived(event: { data: Message[] }): void {
		try {
			// 验证事件是否有效
			if (!event || !event.data || !Array.isArray(event.data)) {
				console.warn(LOG_PRIFIX, '收到无效的消息事件:', event)
				return
			}

			console.log('DEBUG_LOG:call handleMessageReceived', event.data)
			event.data.forEach(message => {
				try {
					const conversationType = message.conversationType
					if (conversationType === TencentCloudChat.TYPES.CONV_GROUP) {
						// 群组消息处理逻辑
					}
					// 触发消息接收事件
					this.emitter.emit(IMEventType.CHAT_MSG, message)
				} catch (error) {
					console.error(LOG_PRIFIX, '处理单条消息失败:', error, message)
				}
			})
		} catch (error) {
			console.error(LOG_PRIFIX, '处理消息事件失败:', error)
		}
	}

	confirmReady(): void {
		if (!this.ready) {
			throw new IMError('IM SDK 未准备就绪', 'SDK_NOT_READY')
		}
	}

	/**
	 * 加入群组 - 参与聊天
	 * @param groupID 群组ID
	 * @returns 群组信息
	 */
	public async joinGroup(groupID: string): Promise<any> {
		try {
			// 验证群组ID不能为空
			this.validateGroupID(groupID)
			// 确认SDK是否就绪
			this.confirmReady()

			// 检查是否已加入
			if (this.joinedGroups.has(groupID)) {
				console.log(LOG_PRIFIX, `已加入群组 ${groupID}，跳过重复加入`)
				return
			}

			console.log('DEBUG_LOG:call join group', groupID)
			// 加入群组
			const result = await this.chat.joinGroup({ groupID, type: TencentCloudChat.TYPES.GRP_AVCHATROOM })
			this.joinedGroups.add(groupID)
			console.log(LOG_PRIFIX, `已加入群组 ${groupID}`)
			return result
		} catch (error) {
			console.error(LOG_PRIFIX, `加入群组 ${groupID} 失败:`, error)

			if (error instanceof IMError) {
				throw error
			}

			// 处理腾讯云IM的错误码
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = (error as any).code
				let message = '加入群组失败'

				switch (errorCode) {
					case 10010:
						message = '群组不存在'
						break
					case 10011:
						message = '已在群组中'
						break
					case 10012:
						message = '群组已满'
						break
					default:
						message = `加入群组失败: ${errorCode}`
				}

				throw new IMError(message, 'JOIN_GROUP_FAILED', error)
			}

			throw new IMError('加入群组失败', 'JOIN_GROUP_FAILED', error)
		}
	}

	/**
	 * 退出群组 - 离开聊天
	 * @param groupID 群组ID
	 * @returns void
	 */
	public async quitGroup(groupID: string): Promise<void> {
		try {
			this.validateGroupID(groupID)
			this.confirmReady()

			// 检查是否已加入
			if (!this.joinedGroups.has(groupID)) {
				console.log(LOG_PRIFIX, `未加入群组 ${groupID}，无需退出`)
				return
			}

			this.joinedGroups.delete(groupID)

			// 退出群组
			await this.chat.quitGroup(groupID)
			console.log(LOG_PRIFIX, `已退出群组 ${groupID}`)
		} catch (error) {
			console.error(LOG_PRIFIX, `退出群组 ${groupID} 失败:`, error)

			if (error instanceof IMError) {
				throw error
			}

			throw new IMError('退出群组失败', 'QUIT_GROUP_FAILED', error)
		}
	}

	/**
	 * 获取历史消息
	 * @param options 获取历史消息的选项
	 * @returns 历史消息列表和分页信息
	 */
	async getHistoryMessages(options: HistoryMessageOptions): Promise<{
		messageList: Message[]
		isCompleted: boolean
		nextReqMessageID?: string
	}> {
		try {
			this.confirmReady()
			this.validateConversationID(options.conversationID)

			const { conversationID, nextReqMessageID } = options

			console.log(LOG_PRIFIX, `开始获取历史消息: ${conversationID}`, options)

			// 构建获取历史消息的参数
			const getMessageListParams: any = {
				conversationID: `${conversationID}`,
			}

			// 可选参数  // 分页参数
			if (nextReqMessageID) {
				getMessageListParams.nextReqMessageID = nextReqMessageID
			}

			const result = await this.chat.getMessageList(getMessageListParams)

			console.log(LOG_PRIFIX, `获取历史消息成功: ${conversationID}`, {
				messageList: result.data.messageList,
				isCompleted: result.data.isCompleted,
				nextReqMessageID: result.data.nextReqMessageID,
			})

			return {
				messageList: result.data.messageList || [],
				isCompleted: result.data.isCompleted,
				nextReqMessageID: result.data.nextReqMessageID,
			}
		} catch (error) {
			console.error(LOG_PRIFIX, `获取历史消息失败: ${options.conversationID}`, error)

			if (error instanceof IMError) {
				throw error
			}

			throw new IMError('获取历史消息失败', 'GET_HISTORY_MESSAGES_FAILED', error)
		}
	}

	/**
	 * 获取最近指定数量的消息
	 * @param conversationID 会话ID
	 * @param targetCount 目标消息数量
	 * @param maxRetries 最大重试次数，防止无限递归
	 * @returns 消息列表
	 */
	async getRecentMessages(
		conversationID: string,
		targetCount: number = 50,
		maxRetries: number = 10,
	): Promise<Message[]> {
		try {
			this.confirmReady()
			this.validateConversationID(conversationID)

			if (targetCount <= 0) {
				throw new IMError('目标消息数量必须大于0', 'INVALID_TARGET_COUNT', { targetCount })
			}

			if (maxRetries < 0) {
				throw new IMError('最大重试次数不能为负数', 'INVALID_MAX_RETRIES', { maxRetries })
			}

			const allMessages: Message[] = []
			let nextReqMessageID: string | undefined
			let retryCount = 0

			console.log(LOG_PRIFIX, `开始获取最近 ${targetCount} 条消息: ${conversationID}`)
			// 循环获取消息直到达到目标数量
			while (allMessages.length < targetCount) {
				try {
					const result = await this.getHistoryMessages({
						conversationID,
						nextReqMessageID,
					})

					// 如果没有获取到消息，退出循环
					if (!result.messageList || result.messageList.length === 0) {
						console.log(LOG_PRIFIX, `没有更多消息，停止获取: ${conversationID}`)
						break
					}

					// 添加消息到列表
					allMessages.push(...result.messageList)
					console.log(LOG_PRIFIX, `已获取 ${allMessages.length} 条消息，目标: ${targetCount}`)

					// 如果已经完成或没有下一页标识，退出循环
					if (result.isCompleted || !result.nextReqMessageID) {
						console.log(LOG_PRIFIX, `消息获取完成: ${conversationID}`)
						break
					}

					// 设置下一页标识
					nextReqMessageID = result.nextReqMessageID
				} catch (error) {
					retryCount++
					console.warn(LOG_PRIFIX, `获取消息失败，重试第 ${retryCount} 次: ${conversationID}`, error)

					// 如果达到最大重试次数，抛出异常
					if (retryCount >= maxRetries) {
						console.error(LOG_PRIFIX, `达到最大重试次数 ${maxRetries}，停止重试: ${conversationID}`)
						throw new IMError('获取消息重试次数超限', 'MAX_RETRIES_EXCEEDED', {
							conversationID,
							retryCount,
							maxRetries,
							error,
						})
					}

					// 等待一段时间后重试
					await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
				}
			}

			console.log(LOG_PRIFIX, `最终获取到 ${allMessages.length} 条消息: ${conversationID}`)
			return allMessages
		} catch (error) {
			console.error(LOG_PRIFIX, `获取最近消息失败: ${conversationID}`, error)

			if (error instanceof IMError) {
				throw error
			}

			throw new IMError('获取最近消息失败', 'GET_RECENT_MESSAGES_FAILED', error)
		}
	}

	/**
	 * 发送群组文本消息
	 * @param groupID 群组ID
	 * @param text 消息内容
	 * @returns 消息ID
	 */
	async sendGroupTextMessage(groupID: string, text: string): Promise<number> {
		try {
			// 参数验证
			this.validateGroupID(groupID)
			this.confirmReady()

			if (!text || typeof text !== 'string' || text.trim().length === 0) {
				throw new IMError('消息内容不能为空', 'INVALID_MESSAGE_TEXT', { text })
			}

			const message = this.chat.createTextMessage({
				to: groupID,
				conversationType: TencentCloudChat.TYPES.CONV_GROUP,
				payload: { text },
			})

			// 发送消息
			await this.chat.sendMessage(message)
			console.log(LOG_PRIFIX, `群组消息发送成功: ${groupID}`)
			return 0
		} catch (error) {
			console.error(LOG_PRIFIX, `群组消息发送失败: ${groupID}`, error)

			if (error instanceof IMError) {
				throw error
			}

			throw new IMError('群组消息发送失败', 'SEND_GROUP_MESSAGE_FAILED', error)
		}
	}

	/**
	 * 发送私聊文本消息
	 * @param userID 用户ID
	 * @param text 消息内容
	 * @returns 消息ID
	 */
	async sendPrivateTextMessage(userID: string, text: string): Promise<number> {
		try {
			// 参数验证
			this.validateNotEmpty(userID)
			this.confirmReady()

			if (!text || typeof text !== 'string' || text.trim().length === 0) {
				throw new IMError('消息内容不能为空', 'INVALID_MESSAGE_TEXT', { text })
			}
			// 创建私聊消息
			const message = this.chat.createTextMessage({
				to: userID,
				conversationType: TencentCloudChat.TYPES.CONV_C2C,
				payload: { text },
			})
			// 发送消息
			await this.chat.sendMessage(message)
			console.log(LOG_PRIFIX, `私聊消息发送成功: ${userID}`)
			return 0
		} catch (error) {
			console.error(LOG_PRIFIX, `私聊消息发送失败: ${userID}`, error)

			if (error instanceof IMError) {
				throw error
			}

			throw new IMError('私聊消息发送失败', 'SEND_PRIVATE_MESSAGE_FAILED', error)
		}
	}

	on(eventType: IMEventTypeValue, handler: (...args: any[]) => void): void {
		try {
			if (!eventType || !handler || typeof handler !== 'function') {
				throw new IMError('事件类型和处理器不能为空', 'INVALID_EVENT_HANDLER', { eventType, handler })
			}

			this.handlerRecords.push({ eventType, handler })
			this.emitter.on(eventType, handler)
		} catch (error) {
			console.error(LOG_PRIFIX, '注册事件监听器失败:', error)
			throw error
		}
	}

	off(eventType: IMEventTypeValue, handler: (...args: any[]) => void): void {
		try {
			if (!eventType || !handler) {
				console.warn(LOG_PRIFIX, '事件类型或处理器为空，跳过移除监听器')
				return
			}

			this.emitter.off(eventType, handler)
		} catch (error) {
			console.error(LOG_PRIFIX, '移除事件监听器失败:', error)
		}
	}

	offAllListeners(): void {
		console.log('offAllListeners', this.handlerRecords) //todo单列不能删除
		// try {
		//     this.handlerRecords.forEach(record => {
		//         this.emitter.off(record.eventType, record.handler)
		//     })
		//     this.handlerRecords = []
		//     console.log(LOG_PRIFIX, '已移除所有事件监听器')
		// } catch (error) {
		//     console.error(LOG_PRIFIX, '移除所有事件监听器失败:', error)
		// }
	}
	// 添加获取登录状态的公共方法
	public getLoginState(): boolean {
		return this.isUserLoggedIn
	}

	// 获取连接状态
	public getConnectionState(): ConnectionState {
		return this.connectionState
	}

	// 获取网络状态
	public getNetworkState(): NetworkState {
		return this.networkState
	}

	// 获取健康状态
	public getHealthStatus(): any {
		return {
			connectionState: this.connectionState,
			networkState: this.networkState,
			isReady: this.ready,
			isLoggedIn: this.isUserLoggedIn,
			errorCount: this.errorCount,
			reconnectAttempts: this.reconnectAttempts,
			lastHeartbeat: this.lastHeartbeat,
			timestamp: Date.now(),
		}
	}

	// 手动触发健康检查
	public triggerHealthCheck(): void {
		this.performHealthCheck()
	}

	// 重置错误计数
	public resetErrorCount(): void {
		this.errorCount = 0

		// 更新状态
		this.updateState({
			errorCount: 0,
		})

		console.log(LOG_PRIFIX, '错误计数已重置')
	}

	// 销毁实例
	public destroy(): void {
		this.cleanup()
		this.offAllListeners()
		this.joinedGroups.clear()
		this.isUserLoggedIn = false
		this.ready = false
		console.log(LOG_PRIFIX, 'IM 管理器已销毁')
	}

	// 获取群组信息
	public async getGroupInfo(groupID: string): Promise<GroupInfo> {
		try {
			this.validateGroupID(groupID)
			this.confirmReady()

			const result = await this.chat.getGroupProfile({ groupID })
			console.log(LOG_PRIFIX, `获取群组信息成功: ${groupID}`, result)
			return result.data.group
		} catch (error) {
			console.error(LOG_PRIFIX, `获取群组信息失败: ${groupID}`, error)
			throw new IMError('获取群组信息失败', 'GET_GROUP_INFO_FAILED', error)
		}
	}

	// 获取用户在群组中的角色
	public async getGroupMemberRole(groupID: string, userID: string): Promise<GroupRole> {
		try {
			this.validateGroupID(groupID)
			this.validateNotEmpty(userID)
			this.confirmReady()

			const result = await this.chat.getGroupMemberProfile({
				groupID,
				userIDList: [userID],
			})

			const member = result.data.memberList[0]
			if (!member) {
				throw new IMError('用户不在群组中', 'USER_NOT_IN_GROUP', { groupID, userID })
			}

			return member.role as GroupRole
		} catch (error) {
			console.error(LOG_PRIFIX, `获取群组成员角色失败: ${groupID} - ${userID}`, error)
			throw new IMError('获取群组成员角色失败', 'GET_MEMBER_ROLE_FAILED', error)
		}
	}

	// 检查用户是否为管理员（群主或管理员）
	public async checkAdminPermission(groupID: string, operatorID: string): Promise<boolean> {
		try {
			const operatorRole = await this.getGroupMemberRole(groupID, operatorID)
			return operatorRole === GroupRole.OWNER || operatorRole === GroupRole.ADMIN
		} catch (error) {
			console.error(LOG_PRIFIX, `检查管理员权限失败: ${groupID} - ${operatorID}`, error)
			return false
		}
	}

	// 踢出群组成员（带权限检查）
	public async kickGroupMember(
		groupID: string,
		memberIDList: string[],
		operatorID?: string,
	): Promise<KickMemberResult> {
		try {
			this.validateGroupID(groupID)
			this.confirmReady()

			// 如果没有指定操作者，使用当前登录用户
			const currentOperatorID = operatorID || this.getCurrentUserID()
			if (!currentOperatorID) {
				return {
					success: false,
					message: '未找到当前用户ID',
					errorCode: 10001,
				}
			}

			// 检查权限
			const hasPermission = await this.checkAdminPermission(groupID, currentOperatorID)
			if (!hasPermission) {
				return {
					success: false,
					message: '权限不足，只有群主和管理员可以踢人',
					errorCode: 10002,
					details: {
						operatorID: currentOperatorID,
						groupID,
						requiredRoles: [GroupRole.OWNER, GroupRole.ADMIN],
					},
				}
			}

			// 检查是否尝试踢出群主
			const groupInfo = await this.getGroupInfo(groupID)
			const isKickingOwner = memberIDList.includes(groupInfo.ownerID)
			if (isKickingOwner) {
				return {
					success: false,
					message: '不能踢出群主',
					errorCode: 10003,
					details: { ownerID: groupInfo.ownerID },
				}
			}

			// 检查是否尝试踢出管理员（只有群主可以踢出管理员）
			const operatorRole = await this.getGroupMemberRole(groupID, currentOperatorID)
			if (operatorRole !== GroupRole.OWNER) {
				// 检查要踢出的用户中是否有管理员
				const membersToKick = await Promise.all(memberIDList.map(userID => this.getGroupMemberRole(groupID, userID)))
				const hasAdminInList = membersToKick.some(role => role === GroupRole.ADMIN)
				if (hasAdminInList) {
					return {
						success: false,
						message: '只有群主可以踢出管理员',
						errorCode: 10004,
						details: { operatorRole, targetRoles: membersToKick },
					}
				}
			}

			// 执行踢人操作
			const result = await this.chat.deleteGroupMember({
				groupID,
				userIDList: memberIDList,
				reason: '被管理员踢出群组',
			})

			console.log(LOG_PRIFIX, `踢出群组成员成功: ${groupID}`, {
				operatorID: currentOperatorID,
				memberIDList,
				result,
			})

			return {
				success: true,
				message: `成功踢出 ${memberIDList.length} 名成员`,
				details: result,
			}
		} catch (error) {
			console.error(LOG_PRIFIX, `踢出群组成员失败: ${groupID}`, error)

			// 处理腾讯云IM的错误码
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = (error as any).code
				let message = '踢出群组成员失败'

				switch (errorCode) {
					case 10010:
						message = '群组不存在'
						break
					case 10011:
						message = '用户不在群组中'
						break
					case 10013:
						message = '权限不足'
						break
					case 10014:
						message = '群组已满'
						break
					case 10015:
						message = '群组类型不支持此操作'
						break
					default:
						message = `踢出群组成员失败: ${errorCode}`
				}

				return {
					success: false,
					message,
					errorCode,
					details: error,
				}
			}

			return {
				success: false,
				message: '踢出群组成员失败',
				errorCode: 10000,
				details: error,
			}
		}
	}

	// 获取当前用户ID（需要从外部传入或从登录状态获取）
	private getCurrentUserID(): string | null {
		// 这里需要根据实际情况获取当前用户ID
		// 可能需要从外部传入或从登录状态获取
		return this.currentUserID
	}

	// 检查用户是否有修改角色权限
	public async checkSetRolePermission(groupID: string, operatorID: string): Promise<boolean> {
		try {
			const operatorRole = await this.getGroupMemberRole(groupID, operatorID)
			return operatorRole === GroupRole.OWNER
		} catch (error) {
			console.error(LOG_PRIFIX, `检查修改角色权限失败: ${groupID} - ${operatorID}`, error)
			return false
		}
	}

	// 设置群组成员角色（只有群主可以操作）
	public async setGroupMemberRole(
		groupID: string,
		userID: string,
		role: GroupRole,
		operatorID?: string,
	): Promise<SetGroupMemberRoleResult> {
		try {
			this.validateGroupID(groupID)
			this.validateNotEmpty(userID)
			this.confirmReady()

			// 如果没有指定操作者，使用当前登录用户
			const currentOperatorID = operatorID || this.getCurrentUserID()
			if (!currentOperatorID) {
				return {
					success: false,
					message: '未找到当前用户ID',
					errorCode: 20001,
				}
			}

			// 检查操作者权限（只有群主可以修改角色）
			const hasPermission = await this.checkSetRolePermission(groupID, currentOperatorID)
			if (!hasPermission) {
				return {
					success: false,
					message: '权限不足，只有群主可以修改成员角色',
					errorCode: 20002,
					details: {
						operatorID: currentOperatorID,
						groupID,
						requiredRole: GroupRole.OWNER,
					},
				}
			}

			// 检查是否尝试修改群主角色
			const groupInfo = await this.getGroupInfo(groupID)
			if (userID === groupInfo.ownerID) {
				return {
					success: false,
					message: '不能修改群主的角色',
					errorCode: 20003,
					details: { ownerID: groupInfo.ownerID },
				}
			}

			// 检查目标用户是否在群组中
			const targetUserRole = await this.getGroupMemberRole(groupID, userID)
			if (!targetUserRole) {
				return {
					success: false,
					message: '目标用户不在群组中',
					errorCode: 20004,
					details: { userID },
				}
			}

			// 检查是否尝试设置无效角色
			if (role === GroupRole.OWNER) {
				return {
					success: false,
					message: '不能将普通成员设置为群主',
					errorCode: 20005,
					details: { targetRole: role },
				}
			}

			// 执行角色修改操作
			let result: any
			if (role === GroupRole.ADMIN) {
				// 设置为管理员
				result = await this.chat.setGroupMemberRole({
					groupID,
					userID,
					role: TencentCloudChat.TYPES.GRP_MBR_ROLE_ADMIN,
				})
			} else if (role === GroupRole.MEMBER) {
				// 取消管理员（设置为普通成员）
				result = await this.chat.setGroupMemberRole({
					groupID,
					userID,
					role: TencentCloudChat.TYPES.GRP_MBR_ROLE_MEMBER,
				})
			} else {
				return {
					success: false,
					message: '不支持的角色类型',
					errorCode: 20006,
					details: { role },
				}
			}

			console.log(LOG_PRIFIX, `修改群组成员角色成功: ${groupID}`, {
				operatorID: currentOperatorID,
				userID,
				newRole: role,
				result,
			})

			return {
				success: true,
				message: `成功将用户 ${userID} 的角色修改为 ${role}`,
				details: result,
			}
		} catch (error) {
			console.error(LOG_PRIFIX, `修改群组成员角色失败: ${groupID}`, error)

			// 处理腾讯云IM的错误码
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = (error as any).code
				let message = '修改群组成员角色失败'

				switch (errorCode) {
					case 10010:
						message = '群组不存在'
						break
					case 10011:
						message = '用户不在群组中'
						break
					case 10013:
						message = '权限不足'
						break
					case 10015:
						message = '群组类型不支持此操作'
						break
					case 10016:
						message = '角色设置失败'
						break
					default:
						message = `修改群组成员角色失败: ${errorCode}`
				}

				return {
					success: false,
					message,
					errorCode,
					details: error,
				}
			}

			return {
				success: false,
				message: '修改群组成员角色失败',
				errorCode: 20000,
				details: error,
			}
		}
	}

	// 设置为管理员（便捷方法）
	public async setGroupAdmin(groupID: string, userID: string, operatorID?: string): Promise<SetGroupMemberRoleResult> {
		return this.setGroupMemberRole(groupID, userID, GroupRole.ADMIN, operatorID)
	}

	// 取消管理员（便捷方法）
	public async removeGroupAdmin(
		groupID: string,
		userID: string,
		operatorID?: string,
	): Promise<SetGroupMemberRoleResult> {
		return this.setGroupMemberRole(groupID, userID, GroupRole.MEMBER, operatorID)
	}

	// 检查用户是否为群主
	public async checkOwnerPermission(groupID: string, operatorID: string): Promise<boolean> {
		try {
			const operatorRole = await this.getGroupMemberRole(groupID, operatorID)
			return operatorRole === GroupRole.OWNER
		} catch (error) {
			console.error(LOG_PRIFIX, `检查群主权限失败: ${groupID} - ${operatorID}`, error)
			return false
		}
	}

	// 解散群组（只有群主可以操作）
	public async dismissGroup(groupID: string, operatorID?: string): Promise<DismissGroupResult> {
		try {
			this.validateGroupID(groupID)
			this.confirmReady()

			// 如果没有指定操作者，使用当前登录用户
			const currentOperatorID = operatorID || this.getCurrentUserID()
			if (!currentOperatorID) {
				return {
					success: false,
					message: '未找到当前用户ID',
					errorCode: 30001,
				}
			}

			// 检查操作者权限（只有群主可以解散群组）
			const hasPermission = await this.checkOwnerPermission(groupID, currentOperatorID)
			if (!hasPermission) {
				return {
					success: false,
					message: '权限不足，只有群主可以解散群组',
					errorCode: 30002,
					details: {
						operatorID: currentOperatorID,
						groupID,
						requiredRole: GroupRole.OWNER,
					},
				}
			}

			// 获取群组信息确认群主身份
			const groupInfo = await this.getGroupInfo(groupID)
			if (groupInfo.ownerID !== currentOperatorID) {
				return {
					success: false,
					message: '只有群主可以解散群组',
					errorCode: 30003,
					details: {
						operatorID: currentOperatorID,
						ownerID: groupInfo.ownerID,
					},
				}
			}

			// 执行解散群组操作
			const result = await this.chat.dismissGroup(groupID)

			// 从已加入群组列表中移除
			this.joinedGroups.delete(groupID)

			console.log(LOG_PRIFIX, `解散群组成功: ${groupID}`, {
				operatorID: currentOperatorID,
				result,
			})

			return {
				success: true,
				message: `成功解散群组 ${groupID}`,
				details: result,
			}
		} catch (error) {
			console.error(LOG_PRIFIX, `解散群组失败: ${groupID}`, error)

			// 处理腾讯云IM的错误码
			if (error && typeof error === 'object' && 'code' in error) {
				const errorCode = (error as any).code
				let message = '解散群组失败'

				switch (errorCode) {
					case 10010:
						message = '群组不存在'
						break
					case 10013:
						message = '权限不足，只有群主可以解散群组'
						break
					case 10015:
						message = '群组类型不支持此操作'
						break
					case 10016:
						message = '群组状态异常'
						break
					default:
						message = `解散群组失败: ${errorCode}`
				}

				return {
					success: false,
					message,
					errorCode,
					details: error,
				}
			}

			return {
				success: false,
				message: '解散群组失败',
				errorCode: 30000,
				details: error,
			}
		}
	}
}

export function useIMManager(userID?: string, userSig?: string) {
	const imManager = IMManager.getInstance()
	const state = ref<IMState>(imManager.getState())

	try {
		imManager.offAllListeners()

		// 设置状态变化监听
		imManager.onStateChange((newState: IMState) => {
			state.value = newState
		})

		onMounted(async () => {
			try {
				// 先登出
				if (imManager.getLoginState()) {
					await imManager.logout()
				}
				if (userID && userSig) {
					// 如果有 userID 和 userSig，则登录
					await imManager.login(userID, userSig)
				}
			} catch (error) {
				console.error(LOG_PRIFIX, 'IM 初始化失败:', error)

				// 如果是自定义错误，直接抛出
				if (error instanceof IMError) {
					throw error
				}

				// 否则包装成自定义错误
				throw new IMError('IM 初始化失败', 'INIT_FAILED', error)
			}
		})

		// 组件卸载时清理资源
		onUnmounted(() => {
			// 注意：这里不要销毁实例，因为可能是单例
			// 只清理事件监听器
			imManager.offAllListeners()
		})
	} catch (error) {
		console.error(LOG_PRIFIX, 'useIMManager 初始化失败:', error)
		throw error
	}

	return {
		imManager,
		state: readonly(state),
		// 便捷的状态访问方法
		isReady: computed(() => state.value.isReady),
		isLoggedIn: computed(() => state.value.isLoggedIn),
		connectionState: computed(() => state.value.connectionState),
		networkState: computed(() => state.value.networkState),
		errorCount: computed(() => state.value.errorCount),
		reconnectAttempts: computed(() => state.value.reconnectAttempts),
	}
}
