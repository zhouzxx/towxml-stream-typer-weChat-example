//看到这个组件的时候你可能会有疑问，为什么要多封装一个组件chat-body,而不直接把内容全部写在ai-chat组件中
//原因就是我要把渲染聊天记录的wx:for 与 包裹它的scroll-view之间进行组件隔离，因为你可能会在打字的过程中要求时刻滚动到底部，实现的方式有改变scrollTop或者scroll-into-view等
//无论哪一种方式都是要更新scroll-view组件上的属性，就会导致scroll-view所在的组件更新，更新意味着diff scroll-view所在组件的新老dom树等，由于微信小程序是组件级更新，如果你把往wx:for和scroll-view写在一个组件里，wx:for中的内容也会跟着diff而消耗性能，经过我的测试,随着聊天内容越来越多，会逐渐明显地影响性能。
//所以如果你把wx:for的内容单独封装为一个组件，由于diff只在当前组件,不会diff子组件，scroll-view更新时就不会导致wx:for这部分内容的diff

// 引入必要的函数
const {
  setQueryTowxmlNodeFn
} = require("../towxml/globalCb");

Component({
  properties: {
    messages: {
      type: Array,
      value: [],
    }
  },
  data: {
    questionType: 0, // 问题类型标识
    answerType: 1, // 答案类型标识
    speed: 10, // 打字速度相关参数
  },
  lifetimes: {
    ready() {
      //为什么要麻烦你导入setQueryTowxmlNodeFn函数，并进行赋值，因为我为了节约内存，做虚拟显示，即只加载当前屏幕上下几屏的内容，必须要获得每一个towxml的top位置，同时为了性能和其他方面的考虑，我需要一次性获取所有towxml组件的top位置
      //由于微信小程序的限制，createSelectorQuery只能查询到当前组件内的dom标签，不能查询父组件中或者页面上的标签，我无法在一个towmxl组件实例中获取其他towmxl实例对应的位置，所以不得不需要你的帮助
      //你就保持这个函数不变（即使用selectAll查询towxml的父标签）我这里是用了一个view包裹了towxml,并设置了一个类名叫做answer-item，不要给这个view设什么padding之类的，最好保证这个view的高度和towxml的高度一致
      //如果你没有设置这个函数，那么就没有虚拟显示功能，即显示所有内容，这样的话内存会慢慢撑爆而导致发热闪退
      setQueryTowxmlNodeFn.value = (fn) => {
        wx.createSelectorQuery().in(this)
          .selectAll(".answer-item")
          .boundingClientRect((towxmlNodes) => {
            // console.log("页面上所有的towmxlNodes的值：",towxmlNodes)
            fn(towxmlNodes);
          })
          .exec();
      };
    }
  },
  methods: {
    finish(e) {
      this.triggerEvent("finish", e);
    },
  }
});