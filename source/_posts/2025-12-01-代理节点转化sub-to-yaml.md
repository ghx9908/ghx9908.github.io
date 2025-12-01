---
title: 代理节点转化sub_to_yaml
author: 高红翔
date: 2025-12-01 10:56:11
categories:
tags:
---

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
订阅链接转 Clash YAML 配置文件工具
兼容两种模式：
1. sub:// 格式（base64编码的订阅链接）
2. 普通 HTTP/HTTPS 订阅 URL
"""

import base64
import urllib.parse
import sys
import urllib.request
import re

def parse_sub_url(sub_url):
    """解析 sub:// 格式的订阅链接"""
    if not sub_url.startswith('sub://'):
        return None, None

    # 移除 sub:// 前缀
    content = sub_url[6:]  # 移除 'sub://'

    # 分离名称部分（如果有）
    if '#' in content:
        encoded_url, name = content.rsplit('#', 1)
        name = urllib.parse.unquote(name)
    else:
        encoded_url = content
        name = None

    # 解码 base64 URL
    try:
        # 添加 padding
        padding = 4 - len(encoded_url) % 4
        if padding != 4:
            encoded_url += '=' * padding

        decoded_url = base64.b64decode(encoded_url).decode('utf-8')
        return decoded_url, name
    except Exception as e:
        print(f"❌ 解码订阅链接失败: {e}", file=sys.stderr)
        return None, None

def detect_subscription_type(input_str):
    """检测订阅链接类型"""
    if input_str.startswith('sub://'):
        return 'sub'
    elif input_str.startswith('http://') or input_str.startswith('https://'):
        return 'url'
    else:
        return None

def parse_ss_url(ss_url):
    """解析 SS URL 格式: ss://base64@host:port#name"""
    try:
        if not ss_url.startswith('ss://'):
            return None

        content = ss_url[5:]

        # 分离名称部分
        if '#' in content:
            url_part, name_encoded = content.rsplit('#', 1)
            name = urllib.parse.unquote(name_encoded)
        else:
            url_part = content
            name = "未命名节点"

        # 分离服务器和认证信息
        if '@' in url_part:
            auth_part, server_part = url_part.rsplit('@', 1)
        else:
            return None

        # 解析服务器和端口
        if ':' in server_part:
            server, port_str = server_part.rsplit(':', 1)
            port = int(port_str)
        else:
            return None

        # 解码认证信息
        try:
            padding = 4 - len(auth_part) % 4
            if padding != 4:
                auth_part += '=' * padding

            decoded = base64.b64decode(auth_part).decode('utf-8')
            if ':' in decoded:
                method, password = decoded.split(':', 1)
            else:
                return None
        except Exception:
            return None

        return {
            'name': name,
            'server': server,
            'port': port,
            'method': method,
            'password': password
        }
    except Exception:
        return None

def fetch_subscription(url):
    """获取订阅内容"""
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            content = response.read().decode('utf-8')
            # 尝试解码 base64（如果订阅内容是 base64 编码的）
            try:
                decoded = base64.b64decode(content).decode('utf-8')
                return decoded
            except:
                # 如果不是 base64，直接返回
                return content
    except Exception as e:
        print(f"❌ 获取订阅失败: {e}", file=sys.stderr)
        return None

def escape_yaml_string(s):
    """转义 YAML 字符串中的特殊字符"""
    if not s:
        return '""'
    # 如果包含特殊字符，使用引号
    if any(c in s for c in [':', '#', '&', '*', '?', '|', '-', '<', '>', '=', '!', '%', '@', '`', '{', '}']):
        escaped = s.replace('"', '\\"').replace('\\', '\\\\')
        return f'"{escaped}"'
    return s

def generate_yaml(nodes, config_name="Clash配置"):
    """生成 YAML 格式的配置文件"""
    yaml_lines = []

    # 基本配置
    yaml_lines.append("port: 7890")
    yaml_lines.append("socks-port: 7891")
    yaml_lines.append("allow-lan: false")
    yaml_lines.append("mode: rule")
    yaml_lines.append("log-level: info")
    yaml_lines.append("external-controller: 127.0.0.1:9090")
    yaml_lines.append("")
    yaml_lines.append("proxies:")

    # 过滤掉信息节点（包含"剩余流量"、"到期"、"重置"等关键词的节点）
    valid_nodes = []
    info_keywords = ['剩余流量', '到期', '重置', '不合适', '跳转域名', '请勿连接']

    for node in nodes:
        if node and not any(keyword in node['name'] for keyword in info_keywords):
            valid_nodes.append(node)

    # 如果没有有效节点，使用所有节点
    if not valid_nodes:
        print("⚠️  警告: 未找到有效节点，将使用所有节点", file=sys.stderr)
        valid_nodes = nodes

    # 添加代理节点
    for proxy in valid_nodes:
        yaml_lines.append(f"  - name: {escape_yaml_string(proxy['name'])}")
        yaml_lines.append(f"    type: ss")
        yaml_lines.append(f"    server: {proxy['server']}")
        yaml_lines.append(f"    port: {proxy['port']}")
        yaml_lines.append(f"    cipher: {proxy['method']}")
        yaml_lines.append(f"    password: {escape_yaml_string(proxy['password'])}")

    yaml_lines.append("")
    yaml_lines.append("proxy-groups:")

    # 获取所有节点名称
    proxy_names = [p['name'] for p in valid_nodes]

    # 自动选择组
    yaml_lines.append("  - name: 自动选择")
    yaml_lines.append("    type: select")
    yaml_lines.append("    proxies:")
    yaml_lines.append("      - DIRECT")
    for name in proxy_names[:30]:  # 添加前30个节点
        yaml_lines.append(f"      - {escape_yaml_string(name)}")

    # 按地区分组
    hk_nodes = [n for n in proxy_names if any(kw in n for kw in ['香港', 'HK', 'Hong', '香'])]
    us_nodes = [n for n in proxy_names if any(kw in n for kw in ['美国', 'US', 'United', '美', 'America'])]
    jp_nodes = [n for n in proxy_names if any(kw in n for kw in ['日本', 'JP', 'Japan', '日'])]
    sg_nodes = [n for n in proxy_names if any(kw in n for kw in ['新加坡', 'SG', 'Singapore', '新'])]
    tw_nodes = [n for n in proxy_names if any(kw in n for kw in ['台湾', 'TW', 'Taiwan', '台'])]
    ru_nodes = [n for n in proxy_names if any(kw in n for kw in ['俄罗斯', 'RU', 'Russia', '俄'])]

    # 香港节点组
    if hk_nodes:
        yaml_lines.append("")
        yaml_lines.append("  - name: 香港节点")
        yaml_lines.append("    type: select")
        yaml_lines.append("    proxies:")
        yaml_lines.append("      - 自动选择")
        yaml_lines.append("      - DIRECT")
        for name in hk_nodes[:15]:
            yaml_lines.append(f"      - {escape_yaml_string(name)}")

    # 美国节点组
    if us_nodes:
        yaml_lines.append("")
        yaml_lines.append("  - name: 美国节点")
        yaml_lines.append("    type: select")
        yaml_lines.append("    proxies:")
        yaml_lines.append("      - 自动选择")
        yaml_lines.append("      - DIRECT")
        for name in us_nodes[:15]:
            yaml_lines.append(f"      - {escape_yaml_string(name)}")

    # 日本节点组
    if jp_nodes:
        yaml_lines.append("")
        yaml_lines.append("  - name: 日本节点")
        yaml_lines.append("    type: select")
        yaml_lines.append("    proxies:")
        yaml_lines.append("      - 自动选择")
        yaml_lines.append("      - DIRECT")
        for name in jp_nodes[:15]:
            yaml_lines.append(f"      - {escape_yaml_string(name)}")

    # 新加坡节点组
    if sg_nodes:
        yaml_lines.append("")
        yaml_lines.append("  - name: 新加坡节点")
        yaml_lines.append("    type: select")
        yaml_lines.append("    proxies:")
        yaml_lines.append("      - 自动选择")
        yaml_lines.append("      - DIRECT")
        for name in sg_nodes[:15]:
            yaml_lines.append(f"      - {escape_yaml_string(name)}")

    # 台湾节点组
    if tw_nodes:
        yaml_lines.append("")
        yaml_lines.append("  - name: 台湾节点")
        yaml_lines.append("    type: select")
        yaml_lines.append("    proxies:")
        yaml_lines.append("      - 自动选择")
        yaml_lines.append("      - DIRECT")
        for name in tw_nodes[:15]:
            yaml_lines.append(f"      - {escape_yaml_string(name)}")

    # 俄罗斯节点组
    if ru_nodes:
        yaml_lines.append("")
        yaml_lines.append("  - name: 俄罗斯节点")
        yaml_lines.append("    type: select")
        yaml_lines.append("    proxies:")
        yaml_lines.append("      - 自动选择")
        yaml_lines.append("      - DIRECT")
        for name in ru_nodes[:15]:
            yaml_lines.append(f"      - {escape_yaml_string(name)}")

    # 添加规则
    yaml_lines.append("")
    yaml_lines.append("rules:")
    yaml_lines.append("  - DOMAIN-SUFFIX,local,DIRECT")
    yaml_lines.append("  - IP-CIDR,127.0.0.0/8,DIRECT")
    yaml_lines.append("  - IP-CIDR,172.16.0.0/12,DIRECT")
    yaml_lines.append("  - IP-CIDR,192.168.0.0/16,DIRECT")
    yaml_lines.append("  - IP-CIDR,10.0.0.0/8,DIRECT")
    yaml_lines.append("  - IP-CIDR,17.0.0.0/8,DIRECT")
    yaml_lines.append("  - IP-CIDR,100.64.0.0/10,DIRECT")
    yaml_lines.append("  - GEOIP,CN,DIRECT")
    yaml_lines.append("  - MATCH,自动选择")

    return "\n".join(yaml_lines)

def main():
    # 默认订阅链接（sub:// 格式）
    default_sub = "sub://xxx"

    # 默认普通 URL（备用）
    default_url = "https://xxx"

    # 从命令行参数或使用默认值
    if len(sys.argv) > 1:
        input_str = sys.argv[1]
    else:
        input_str = default_sub

    print(f"📥 正在解析订阅链接...")
    print(f"   输入: {input_str[:60]}...")

    # 检测订阅类型
    sub_type = detect_subscription_type(input_str)
    subscription_url = None
    config_name = None

    if sub_type == 'sub':
        # 解析 sub:// 格式
        subscription_url, config_name = parse_sub_url(input_str)
        if not subscription_url:
            print("❌ 错误: 无法解析 sub:// 格式的订阅链接")
            print("   请确保链接格式为: sub://base64_url#name")
            sys.exit(1)
        print(f"   类型: sub:// 格式")
        if config_name:
            print(f"   配置名称: {config_name}")

    elif sub_type == 'url':
        # 直接使用 URL
        subscription_url = input_str
        # 尝试从 URL 中提取配置名称
        try:
            parsed = urllib.parse.urlparse(input_str)
            # 可以从域名或其他部分提取名称
            config_name = parsed.netloc.split('.')[0] if parsed.netloc else None
        except:
            config_name = None
        print(f"   类型: HTTP/HTTPS URL")
        if config_name:
            print(f"   配置名称: {config_name}")

    else:
        print("❌ 错误: 不支持的订阅链接格式")
        print("   支持的格式:")
        print("   1. sub://base64_url#name")
        print("   2. http:// 或 https:// 开头的订阅 URL")
        sys.exit(1)

    print(f"✅ 订阅 URL: {subscription_url}")
    print(f"\n📡 正在获取订阅内容...")

    # 获取订阅内容
    content = fetch_subscription(subscription_url)

    if not content:
        print("❌ 错误: 无法获取订阅内容")
        sys.exit(1)

    print(f"✅ 订阅内容获取成功")
    print(f"\n🔍 正在解析节点...")

    # 解析节点
    nodes = []
    for line in content.split('\n'):
        line = line.strip()
        if line and line.startswith('ss://'):
            node = parse_ss_url(line)
            if node:
                nodes.append(node)

    print(f"✅ 找到 {len(nodes)} 个节点")

    if not nodes:
        print("❌ 错误: 未找到有效节点")
        sys.exit(1)

    # 生成输出文件名
    if config_name:
        output_file = f"{config_name}.yaml"
        # 清理文件名中的非法字符
        output_file = re.sub(r'[<>:"/\\|?*]', '_', output_file)
    else:
        # 从 URL 提取文件名
        try:
            parsed = urllib.parse.urlparse(subscription_url)
            domain = parsed.netloc.split('.')[0] if parsed.netloc else 'clash'
            output_file = f"{domain}_config.yaml"
        except:
            output_file = "clash_config.yaml"

    print(f"\n📝 正在生成 Clash 配置文件...")
    yaml_content = generate_yaml(nodes, config_name or "Clash配置")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(yaml_content)

    print(f"\n✅ 配置文件已生成: {output_file}")
    print(f"📋 共 {len(nodes)} 个节点")

    # 统计信息
    valid_count = len([n for n in nodes if not any(kw in n['name'] for kw in ['剩余流量', '到期', '重置', '不合适', '跳转域名', '请勿连接'])])
    print(f"📊 有效节点: {valid_count} 个")

    print(f"\n📖 使用方法:")
    print(f"1. 打开 ClashX")
    print(f"2. 点击菜单栏 ClashX 图标 -> 配置 -> 打开配置文件夹")
    print(f"3. 将 {output_file} 复制到该文件夹")
    print(f"4. 在 ClashX 中选择该配置文件")
    print(f"\n📁 配置文件路径: {output_file}")
    print(f"\n💡 提示: 支持两种订阅格式")
    print(f"   - sub:// 格式: python3 sub_to_yaml.py 'sub://...'")
    print(f"   - URL 格式: python3 sub_to_yaml.py 'https://...'")

if __name__ == '__main__':
    main()


```
