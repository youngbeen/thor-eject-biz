
关于thor更新后，该插件需要调整的地方：

## List.vue

* 保留`<section class="page-*param:{bizName}-list">`
* 去除systemconfig引入
* 保留`*import:{import}`
* 注释router的watch
* 注释`initData`方法中参数的必要性校验，调整page的获取逻辑

## AddEdit.vue

* 保留`<section class="page-*param:{bizName}-edit">`
* 去除systemconfig引入
* 保留`*import:{import}`
* 注释router的watch
* 注释`initData`方法中参数的必要性校验，调整page的获取逻辑

## 注意事项

* 需要保证配置数据无lint错误
* 目前bizPageId必须位于配置数据的第一项