const config = require('../config');
Component({
  options: {
    styleIsolation: 'shared'
  },
  properties: {
    data: {
      type: Object,
      value: {}
    }
  },
  data: {
    attr: {
      src: '',
      class: '',
      style: ''
    },
    size: {
      w: 0,
      h: 0
    },
    styleObj: {}
  },
  observers: {
    "data": function (newVal) {
      this.init()
    }
  },
  lifetimes: {
    attached: function () {
      this.init()
    }
  },
  methods: {
    init: function () {
      const _ts = this;
      let dataAttr = this.data.data.attrs;

      // 将图片大小处理到对象中
      if (dataAttr.width) {
        _ts.data.size.w = +dataAttr.width / config.dpr;
      };

      if (dataAttr.height) {
        _ts.data.size.h = +dataAttr.height / config.dpr;
      };

      // 将样式合并到样式对象中
      if (dataAttr.style) {
        let re = /;\s{0,}/ig;
        dataAttr.style = dataAttr.style.replace(re, ';');
        dataAttr.style.split(';').forEach(item => {
          let itemArr = item.split(':');
          if (/^(width|height)$/i.test(itemArr[0])) {
            let num = parseInt(itemArr[1]) || 0,
              key = '';
            // itemArr[1] = num / config.dpr + itemArr[1].replace(num,'');
            switch (itemArr[0].toLocaleLowerCase()) {
              case 'width':
                key = 'w';
                break;
              case 'height':
                key = 'h';
                break;
            };
            _ts.data.size[key] = num / config.dpr;
          } else {
            _ts.data.styleObj[itemArr[0]] = itemArr[1];
          };
        });
      };
      // 设置公式图片
      _ts.setData({
        attrs: {
          src: dataAttr.src,
          class: dataAttr.class,
          style: _ts.setStyle(_ts.data.styleObj)
        },
        size: _ts.data.size
      });
    },
    // 设置图片样式
    setStyle: function (o) {
      let str = ``;
      for (let key in o) {
        str += `${key}:${o[key]};`;
      };
      return str;
    },

    // 图片加载完成设置图片大小
    load: function (e) {
      const _ts = this;

      if (!_ts.data.size.w || !_ts.data.size.h) {
        _ts.setData({
          size: {
            w: e.detail.width / config.dpr,
            h: e.detail.height / config.dpr
          }
        });
      };
    },

    handleImageClick: function (e) {
      const FILE_PATH = "https://www.szzxjy.com.cn/";
      const OSS_PATH = "https://zxx-wwj-oss.oss-cn-shenzhen.aliyuncs.com/";
      //将cdn地址替换为oss地址，因为cdn地址在预览的时候一直转圈，加载不出来，oss地址可以，暂时不知道原因
      const currentImage = e.currentTarget.dataset.src.replace(FILE_PATH, OSS_PATH);
      console.log("currentImage的值：", currentImage)
      wx.previewImage({
        current: currentImage, // 当前显示图片的http链接
        urls: [currentImage] // 需要预览的图片http链接列表
      })
    }
  }
})