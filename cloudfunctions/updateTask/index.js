// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { taskId, title, description, completed } = event;
  
  try {
    // 构建更新数据
    const updateData = {
      title: title,
      description: description || '',
      updatedAt: db.serverDate()
    };
    
    // 如果更新了完成状态
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? db.serverDate() : null;
    }
    
    // 更新任务
    await db.collection('tasks').doc(taskId).update({
      data: updateData
    });
    
    // 查询更新后的任务详情
    const task = await db.collection('tasks').doc(taskId).get();
    
    return {
      success: true,
      data: task.data
    };
  } catch (error) {
    console.error('更新任务失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};