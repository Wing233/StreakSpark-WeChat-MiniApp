// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { taskId } = event;
  
  try {
    // 删除任务
    await db.collection('tasks').doc(taskId).remove();
    
    return {
      success: true,
      message: '任务删除成功'
    };
  } catch (error) {
    console.error('删除任务失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};