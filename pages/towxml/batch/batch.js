const {
  batchRenderCb,
  batchShow,
  batchHide,
  batchHeight,
  batchSetHeight
} = require("./batch-cb");
Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    batchId: {
      type: Number,
      value: 0,
    },
    towxmlId: {
      type: String,
      value: 0,
    }
  },
  lifetimes: {
    ready: function () {
      console.log(`创建了batch${this.data.batchId}`)
      const _this = this
      batchRenderCb.value[this.data.towxmlId][this.data.batchId] = (index, node) => {
        _this.data.batchNodes[index] = node
        _this.setData({
          [`batchNodes[${index}]`]:
            node
        });
      };
      batchShow.value[this.data.towxmlId][this.data.batchId] = () => {
        if (_this.data.isShow == true) {
          return
        }
        _this.data.isShow = true
        _this.setData({
          'batchNodes': _this.data.batchNodes,
          isShow: true
        });
        console.log(`显示了towxml${_this.data.towxmlId}中的batch${this.data.batchId}`)
      }
      batchHide.value[this.data.towxmlId][this.data.batchId] = () => {
        if (_this.data.isShow == false) {
          return
        }
        if(_this.data.height == 0){
          return
        }
        _this.data.isShow = false
        _this.setData({
          isShow: false,
          height: _this.data.height,
          hasSetHeight: _this.data.hasSetHeight
        });
        console.log(`隐藏了towxml${_this.data.towxmlId}中的batch${this.data.batchId}`)
      }
      batchSetHeight.value[this.data.towxmlId][this.data.batchId] = flag => {
        if (_this.data.hasSetHeight && !flag) {
          return
        }
        _this.data.hasSetHeight = true
        const query = _this.createSelectorQuery();
        query.select(`#batch${_this.data.batchId}`).boundingClientRect((rect) => {
          if (rect) {
            _this.data.height = rect.height
            batchHeight.value[_this.data.towxmlId][_this.data.batchId] = rect.height
            _this.setData({
              hasSetHeight: _this.data.hasSetHeight,
              height: _this.data.height
            });
            console.log(`设置了batch${_this.data.batchId}的高度:${rect.height}`)
          } else {
            console.log('未找到指定元素');
          }
        }).exec();
      }
    },
  },
  data: {
    batchNodes: [],
    isShow: true,
    height: 0,
    hasSetHeight: false
  },
  methods: {
  },
});
