Configure
====
Attension: Hot configure reload NOT support, restart to activate new configure

- MaxFileSisze  
    文件大小,单位kb。超过此大小的文件，除非是配置文件，否则不解析
- ExcludeDirectories  
    需要排除的目录数组，以正则匹配相对路径。比如主目录是/data/project，
    需要排除bin目录则写 bin/*
- LuaVersion  
    lua的版本，字符串，值可能是: "5.1" 、 "5.2" 、 "5.3" 、 "LuaJIT"

文件过滤
========
工程目录：VS Code打开的目录会被认为工程目录，只解析该目录中以.lua结尾的文件

- 非工程目录文件（包括被排除的目录）
    - 按单个文件解析，解析符号不会合并到工程符号中。但会使用工程中的符号
- 超大的文件
    - 通过词法解析（即仅解析主要符号），主要用于配置解析(test/conf目录)

类型推导
========
- 本地化
    - local M = M
    - TODO:local N = M
    - TODO:local M = require "no_name"
    - TODO:return {}
- oo(object-oriented)类
    - TODO:继承
- table类
    - TODO:成员函数名和本地不一样

符号
========
- 初始化时，只解析和记录每个文件顶层作用域的符号，以节省CPU和内存
- 局部符号
    - 做一个LRU缓存，记录常用文件的原始符号
    - 查询时，对比原始符号，通过位置(loc)找到当前符号所在的函数，解析该函数的局部符号
    - 得到局部符号后，按作用域对比位置(loc)查找符号