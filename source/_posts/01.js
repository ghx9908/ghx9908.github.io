var nextGreaterElement = function (nums1, nums2) {
  const len1 = nums1.length
  const len2 = nums2.length
  const res = Array(len1).fill(-1)
  const stack = []
  const map = new Map()
  for (let i = 0; i < len2; i++) {
    if (stack.length === 0 || nums2[i] <= nums2[stack[stack.length - 1]]) {
      stack.push(i)
    } else {
      while (stack.length && nums2[i] > nums2[stack[stack.length - 1]]) {
        const curIndex = stack.pop()
        map.set(nums2[i], i - curIndex)
      }
      stack.push(i)
    }
  }
  for (let i = 0; i < nums1.length; i++) {
    res[i] = map.has(nums1[i]) || -1
  }
  console.log("map=>", map)
  return res
}

const arr1 = [4, 1, 2]
const arr2 = [1, 3, 4, 2]
debugger
nextGreaterElement(arr1, arr2)
