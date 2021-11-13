// ==UserScript==
// @name         超星自动跳转视频
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  如下
// @author       QlQl
// @match        *://*.chaoxing.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chaoxing.com
// @original-script https://greasyfork.org/scripts/435457
// @original-author QlQl
// @original-license MIT
// ==/UserScript==


// description:
// - 如果视频长时间不能播放，则跳到下一个视频，最后一个将会跳到第一个（刷时长）
// - 建议配合 https://greasyfork.org/scripts/369625 或者 https://greasyfork.org/scripts/369625 使用（刷章节测试和完成度）

(function() {
  'use strict';

  let settings = {
    // 视频加载的时间，单位 ms
    videoLoadTime: 5000,
    // 如果视频长时间不播放，则自动跳转到下一个视频，单位 ms
    videoTroublemWaitTime: 6000,
    // 跳过的名称
    jumpTitle: '章节测验',
    // 是否在控制台显示进度
    showProgress: true,
  };
  window.addEventListener('load', async function() {
    // 所有的视频
    let tasks = $('.posCatalog_name');
    // 从第 fromIndex 开始
    let fromIndex = 0;
    let chapterId = +window.location.href.split('?')[1].split('&')[0].replace('chapterId=', '');
    for(let i = 0; i < tasks.length; i++) {
      if(+tasks[i].getAttribute("onclick").split('\'')[5] === chapterId) {
        fromIndex = i;
        break;
      }
    }
    // 开始播放视频
    async function finishTask() {
      let troublemFlag = false;
      // 开始播放
      $(window.frames["0"].frames["0"])[0].document.childNodes[1].childNodes[3].childNodes[8].childNodes[0].childNodes[5].click();
      // 监听视频进度
      await new Promise((resolve, reject) => {
        
        let timeId = setInterval(() => {
          if(troublemFlag) {
            clearInterval(timeId);
            reject('troublem');
          }
          troublemFlag = true;
        }, settings.videoTroublemWaitTime);
        
        let lastCurrentTime = 0;
        // video dom
        $(window.frames["0"].frames["0"])[0].document.childNodes[1].childNodes[3].childNodes[8].childNodes[0].childNodes[0]
        .addEventListener('timeupdate', function() {
          if(settings.showProgress)
            console.log((this.currentTime / this.duration * 100 + '').slice(0, 5) + '%');
          if(lastCurrentTime != this.currentTime)
            troublemFlag = false;
          lastCurrentTime = this.currentTime;
          if(Math.abs(this.currentTime - this.duration) <= 0.1) {
            clearInterval(timeId);
            resolve('ok');
          }
        })
      });
    }
    // 切换到第 index 个视频
    function switchTask(index) {
      $('.posCatalog_name').get(index).click();
    }
    while(fromIndex < tasks.length) {
      await new Promise((resolve) => {
        // 跳转后 settigns.videoLoadTime 开始
        setTimeout(async () => {
          // 跳过 settings.jumpTitle
          if($('.prev_title')[0].title !== settings.jumpTitle)
            await finishTask();
          resolve();
        }, settings.videoLoadTime);
      })
      fromIndex = (fromIndex + 1) % tasks.length;
      switchTask(fromIndex);
    }
  });
})();