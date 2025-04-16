Page({
  data: {
      questionType: 0,
      answerType: 1,
      inputText: "",
      scrollIntoViewId: "",
      isFinish: false,
      mdText: { text: "" },
      speed: 10,
      isShow: false
  },
  content: "",
  timer: undefined,
  scroller: 0,

  // 处理输入框内容变化
  onInputChange(e) {
      this.setData({
          inputText: e.detail.value
      });
  },

  sendQuestion() {
      console.log('输入框的值为:', this.data.inputText); // 打印输入框的值
      this.setData({
          isFinish: false,
          isShow: false,
          'mdText.text': ""
      });
      if (this.timer) {
          clearInterval(this.timer);
      }
      setTimeout(() => {
          this.setData({
              isShow: true
          });
          wx.request({
              url: this.data.inputText,
              dataType: 'text',
              success: (res) => {
                  this.generateStreamData(res.data);
                  this.setData({
                      inputText: ""
                  });
              },
              fail: (e) => {
                  this.generateStreamData("文件访问错误！");
                  this.setData({
                      inputText: ""
                  });
              }
          });
      }, 1200);
  },

  generateStreamData(text) {
      this.content = text;
      let c = 0;
      // 模拟流式接口
      this.timer = setInterval(() => {
          if (this.scroller % 100 === 0) {
              this.setData({
                  scrollIntoViewId: ""
              });
              const scrollRender = () => {
                  this.setData({
                      scrollIntoViewId: "scroll-anchor"
                  });
              };
              setTimeout(scrollRender, 0);
          }
          this.scroller++;
          if (c >= this.content.length) {
              this.setData({
                  isFinish: true
              });
              return;
          }
          this.data.mdText.text = this.data.mdText.text + this.content[c];
          c++;
      }, 3);
  },

  finish(e) {
      console.log(e);
      clearInterval(this.timer);
  }
});    