#!/usr/bin/env node

"use strict"

const program = require('commander')
const pkg = require('../package.json')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const {FetchMiGuMusic} = require('../FetchMiGuMusic')

/**
 * 描述
 */
program
	.version(pkg.version)
	.usage('[command]')
	.description('f2m 音乐批量下载工具')

/**
 * 清除已构建的目录
 */
program
	.command('login')
	.description('登录migu')
	.option('-u, --username [username]','用户名')
	.option('-p, --password [password]','密码')
	.action(function(option){
		FetchMiGuMusic.login(option);
	});

/**
 * 清除已构建的目录
 */
program
	.command('down')
	.description('批量下载migu音乐')
	.option('-p, --path [path]','音乐存储路径, 默认当前根目录')
	.option('-k, --keyword [keyword]','搜索keyword, 默认周杰伦')
	.option('-a, --isAsync [isAsync]','下载模式是否异步, 默认同步, 值为布尔型true/false')
	.action(function(option){
		new FetchMiGuMusic(option).downMusic();
	});


program.parse(process.argv);
/**
 * 当用户没有输入任何命令或选项的时候，自动提示帮助
 */
if (program.rawArgs.length <= 2){
	help();
}

function help() {
	program.help();
}