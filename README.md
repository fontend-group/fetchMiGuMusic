# fetchMiGuMusic

~ node bin/cli.js
Usage: cli [command]

f2m 音乐批量下载工具

Options:
  -V, --version    output the version number
  -h, --help       output usage information

Commands:
  login [options]  登录migu
  down [options]   批量下载migu音乐


~ node bin/cli.js login -h
Usage: cli login [options]

登录migu

Options:
  -u, --username [username]  用户名
  -p, --password [password]  密码
  -h, --help                 output usage information

~ node bin/cli.js down -h
Usage: cli down [options]

批量下载migu音乐

Options:
  -p, --path [path]        音乐存储路径, 默认当前根目录
  -k, --keyword [keyword]  搜索keyword, 默认周杰伦
  -a, --isAsync [isAsync]  下载模式是否异步, 默认同步, 值为布尔型true/false
  -h, --help               output usage information
