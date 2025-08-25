// 引入必要的函数
const {
  setMdText,
  scrollCb,
  setStreamFinish,
  stopImmediatelyCb,
} = require("../towxml/globalCb");

Component({
  data: {
    inputText: "", // 输入框中的文本
    scrollIntoViewId: "", // 滚动到指定元素的id
    messages: [], // 消息列表
    showArrow: false, // 是否显示下滑箭头
    isTyping: false, // 是否正在打字
    screenHeight: wx.getSystemInfoSync().windowHeight, // 屏幕高度
    questionType: 0, // 问题类型标识
    answerType: 1, // 答案类型标识
    historyMessageLoaded: true
  },
  lifetimes: {
    attached() {
      // 组件初始化时的一些变量初始化
      this.content = ""; // 存储流式接口返回的完整内容
      this.mdText = ""; // 用来记录本次回答，流式接口累积返回的文本
      this.timer = undefined; // 定时器
      this.scroller = 0; // 滚动计数器
      this.curTowxmlId = ""; // 记录当前正在打字的 towxml 组件的 id
      this.autoScroll = true; // 是否自动滚动
      this.finishedHistoryMessageNum = 0 //已渲染好的历史消息数量
      this.historyMessageNum = 0 //历史消息总数量
    },
    ready() {
      const _this = this
      wx.showModal({
        title: '提示',
        content: '是否加载历史消息？',
        confirmText: '确定',
        confirmColor: '#FF0000',
        cancelText: '取消',
        success(res) {
          if (res.confirm) {
            _this.setData({ historyMessageLoaded: false })
            wx.showLoading({
              title: '历史消息加载中',
              mask: true
            });
            _this.finishedHistoryMessageNum = 0
            _this.historyMessageNum = 0
            wx.request({
              url: 'http://110.41.9.23/static/video-embed.md',
              dataType: 'text', // 对应uni.request的encoding: "utf-8"
              success: async function (res) {
                const historyMessages = []
                //构造30条历史消息
                for (let i = 1; i <= 30; i++) {
                  const curId = new Date().getTime();
                  historyMessages.push({
                    id: curId,
                    content: `历史问题${i}`,
                    type: _this.data.questionType,
                    isHistoryMessage: true
                  });
                  //加个3,防止id重复
                  const towxmlId = curId + 3
                  historyMessages.push({
                    id: towxmlId,
                    type: _this.data.answerType,
                    isHistoryMessage: true,
                  });
                  //历史消息的数量加1
                  _this.historyMessageNum++
                  //必须在渲染历史消息之前就调用这个函数
                  setMdText(towxmlId, res.data)
                  //堵塞一下，防止由时间生成的id重复
                  await new Promise((resolve) => {
                    const timer = setTimeout(() => {
                      resolve()
                      clearTimeout(timer)
                    }, 10)
                  })
                }
                //渲染历史消息
                _this.setData({
                  messages: historyMessages
                })
              }
            })
          }
        }
      })
    }
  },
  methods: {
    sendQuestion() {
      if (!this.data.inputText) {
        return;
      }
      //有可能呢上次的答案还没打字完，你又发送了新的问题，那么做一下重置操作
      this.setData({
        isTyping: false
      });
      setStreamFinish(this.curTowxmlId);
      stopImmediatelyCb(this.curTowxmlId)

      const newQuestion = {
        id: new Date().getTime(),
        content: this.data.inputText,
        type: this.data.questionType
      };
      const newMessages = [...this.data.messages, newQuestion];
      this.setData({
        messages: newMessages
      }, () => {
        // 目前可以给你用来测试的地址，当然可以用你自己的
        // url: `http://47.119.142.242/static/video-embed.md`,
        // url: `http://47.119.142.242/static/md-editor-v3.md`,
        // url: `https://zxx-wwj-oss.oss-cn-shenzhen.aliyuncs.com/schChoose/article/d338e6c9-dc59-45d1-8482-5ea21d05f449/923e9f20-46da-4026-844b-f6a2c14ec0eb.md`,
        // url: `https://zxx-wwj-oss.oss-cn-shenzhen.aliyuncs.com/schChoose/article/4d711758-074e-4be8-b280-77cc51719248/08c54e75-144f-426a-ba38-eb91cf464846.md`,
        wx.request({
          url: this.data.inputText,
          encoding: "utf-8",
          success: (res) => {
            // 记录当前正在打字的 towxml 组件实例的 id，id 一定要唯一，因为每个 towxml 组件都有对应的全局数据，以 id 为索引，id 重复会导致数据使用错乱
            this.curTowxmlId = new Date().getTime();
            const newAnswer = {
              id: this.curTowxmlId,
              type: this.data.answerType
            };
            const updatedMessages = [...this.data.messages, newAnswer];
            this.setData({
              messages: updatedMessages,
              inputText: ""
            });
            // 由于我没有大模型的流式接口，所以这里发给网络请求获取markdown文本，再使用定时器模拟流式接口，你的话就根据你的实际接口情况进行更改
            this.generateStreamData(res.data);
          },
          fail: (e) => {
            this.curTowxmlId = new Date().getTime();
            const newAnswer = {
              id: this.curTowxmlId,
              type: this.data.answerType
            };
            const updatedMessages = [...this.data.messages, newAnswer];
            this.setData({
              messages: updatedMessages,
              inputText: ""
            });
            this.generateStreamData("文件访问错误！");
          }
        });
      });
    },
    generateStreamData(text) {
      // 模拟流式接口的函数
      this.setData({
        isTyping: true
      });
      // 重置当次流式接口对应的文本
      this.mdText = "";
      this.content = text;
      let c = 0;
      // 使用定时器模拟流式接口
      this.timer = setInterval(() => {
        // 每 100 毫秒，将滚动条滚动到底部
        if (this.scroller % 100 === 0 && this.autoScroll) {
          this.scrollToBottom();
        }
        this.scroller++;
        // 流式接口结束
        if (c >= this.content.length) {
          // 通知 towxml 组件，流式接口结束，即本次回答所对应的所有 markdown 文本都已经拼接好了
          // 因为 towmxl 组件判断打字的结束条件是：1. 你的流式接口已经结束，即不在产生新的文本  2. 打字的字符已经超过了文本字符   必须同时满足这两个条件，才能说明打字结束
          // 你需要做的就是调用 setStreamFinish 函数通知到底层 towxml 组件流式接口结束，函数的参数是当前正在打字的 towxml 组件的 id
          setStreamFinish(this.curTowxmlId);
          return;
        }
        // 累积流式接口返回的文本，这里模拟流式接口，所以是一个个字符取的，你当前流式接口返回多少字符，就全部拼接上即可
        this.mdText = this.mdText + this.content[c];
        // 调用 setMdText 函数将最新的文本通知到底层 towxml 组件，函数的参数是当前正在打字的 towxml 组件的 id
        setMdText(this.curTowxmlId, this.mdText);
        c++;
      }, 3);
    },
    scrollToBottom() {
      // 滚动到页面底部的函数
      this.setData({
        scrollIntoViewId: ""
      });
      setTimeout(() => {
        this.setData({
          scrollIntoViewId: "scroll-anchor"
        });
      }, 0);
    },
    finish(e) {
      // 当前回答的打字结束，finish 会被回调，做一些关掉滚动定时器等善后操作
      console.log(e);
      clearInterval(this.timer);
      this.setData({
        isTyping: false
      });
    },
    onScroll(e) {
      // 滚动事件回调，记得在滚动事件中回调 scrollCb，并把参数进行传入，我会根据这个参数判断滚动方向，这样 towxml 组件内部才知道你滚动了，就会帮你进行虚拟显示
      // 如果你没有回调 scrollCb，towxml 组件内部就不会进行虚拟显示，随着程序的持续运行，对话次数的增多，页面的 dom 节点会越来越多，导致 1. 内存占用过大而发烫闪退  2. 随着内存占用过大，垃圾回收频繁，占据了很多运行时间，导致后期的打字速度受影响
      scrollCb(e);
    },
    onTouchStart() {
      // 触摸开始事件回调，只有正在打字的时候，用户滑动一下出现下滑箭头
      if (!this.data.isTyping) {
        return;
      }
      wx.createSelectorQuery().in(this).select(".chat-scroll").scrollOffset((res) => {
        const scrollHeight = res.scrollHeight;
        if (scrollHeight > this.data.screenHeight) {
          this.autoScroll = false;
          this.setData({
            showArrow: true
          });
        }
      }).exec();
    },
    scrollToBottomAndResumeAutoScroll() {
      // 点击箭头下滑到底部，并开启自动滚动更新
      this.autoScroll = true;
      this.setData({
        showArrow: false
      });
      this.scrollToBottom();
    },
    opClick() {
      // 操作按钮点击事件回调
      if (this.data.isTyping) {
        stopImmediatelyCb(this.curTowxmlId);
        this.setData({
          isTyping: false
        })
      } else {
        this.sendQuestion();
      }
    },
    inputTextChange(e) {
      // 输入框文本变化事件回调
      this.setData({
        inputText: e.detail.value
      });
    },
    //每当一条历史消息渲染完毕，就会回调这个函数，当所有的历史消息都渲染完毕，将visibility设为visible
    historyMessageFinish(e) {
      this.finishedHistoryMessageNum++
      //渲染的历史消息数量大于等于历史消息总数，说明全部渲染完毕
      if (this.finishedHistoryMessageNum >= this.historyMessageNum) {
        this.scrollToBottom();
        //因为滚动到底部需要一点时间，所以800毫秒之后再设置可见
        const timer = setTimeout(() => {
          this.setData({ historyMessageLoaded: true })
          wx.hideLoading();
          clearTimeout(timer)
        }, 800)
      }
      console.log("收到一条历史消息渲染完毕的回调")
    }
  }
});
