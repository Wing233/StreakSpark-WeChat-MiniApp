// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { title, description, completed } = event;
  
  try {
    // 获取下一个自增ID
    let nextId;
    try {
      // 尝试更新计数器，获取下一个ID
      const counterResult = await db.collection('counters')
        .doc('taskId')
        .update({
          data: {
            count: _.inc(1)
          }
        });
        
      // 查询更新后的计数器值
      const counter = await db.collection('counters').doc('taskId').get();
      nextId = counter.data.count;
    } catch (error) {
      // 如果计数器不存在，创建它并设置初始值为1
      console.log('计数器不存在，创建新的计数器');
      await db.collection('counters').add({
        data: {
          _id: 'taskId',
          count: 1
        }
      });
      nextId = 1;
    }
    
    // 创建任务数据，使用自增ID
    const result = await db.collection('tasks').add({
      data: {
        id: nextId, // 自增ID字段
        title: title,
        description: description || '',
        completed: completed || false,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        completedAt: completed ? db.serverDate() : null,
        _openid: wxContext.OPENID // 记录创建者的openid
      }
    });
    
    // 查询创建的任务详情
    const task = await db.collection('tasks').doc(result._id).get();
    
    return {
      success: true,
      data: task.data,
      id: nextId // 返回自增ID
    };
  } catch (error) {
    console.error('创建任务失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};