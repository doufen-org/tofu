# 豆坟 修复版

fork 自 [doufen-org tofu](https://github.com/doufen-org/tofu) 项目，因为原项目无人维护，而又有bug，所以勉强为之。

已修复bug：

[标记条目被豆瓣和谐后，备份终端的异常](https://github.com/wangyeming/tofu/commit/95be94f7e52b759b531cf5202184c847b758e603)

原因：豆瓣后台和谐条目后，返回空的interest，而原代码没有处理。