// ==UserScript==
// @name         超星自动跳转视频
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  功能简陋的刷时长脚本
// @author       QlQl
// @match        *://*.chaoxing.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chaoxing.com
// @require      https://code.jquery.com/jquery-1.12.4.min.js
// @original-script https://greasyfork.org/scripts/435457
// @original-author QlQl
// @original-license MIT
// ==/UserScript==


// description:
// - 点击自己想看的那个课程章节，然后刷新，之后不能再手动点击别的章节，以保证脚本的正常运行
// - 如果视频长时间不能播放，则跳到下一个视频，最后一个将会跳到第一个（刷时长）
// - 建议配合 https://greasyfork.org/scripts/369625 或者 https://greasyfork.org/scripts/369625 使用（刷章节测试和完成度）

(async function() {
  'use strict';

  let settings = {
    // 视频加载的时间，单位 ms
    videoLoadTime: 3000,
    // 如果视频长时间不播放，则自动跳转到下一个视频，单位 ms
    videoTroublemWaitTime: 3000,
    // 跳过的名称
    jumpTitle: '章节测验',
    // 是否在控制台显示进度
    showProgress: true,
  };
  // 包裹播放器的 div
  let videoDiv = null;
  
  // 开始播放视频
  async function finishTask() {
    let troublemFlag = false;
    
    // 开始播放
    videoDiv.childNodes[5].click();
    // 监听视频进度
    await new Promise((resolve, reject) => {
      
      let timeId = setInterval(() => {
        if(troublemFlag) {
          clearInterval(timeId);
          resolve('troublem');
        }
        troublemFlag = true;
      }, settings.videoTroublemWaitTime);
      
      let lastCurrentTime = 0;
      // video dom
      videoDiv.childNodes[0]
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
  
  // 关闭
  
  // 加载好后
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
    
    // 循环看每个视频
    while(fromIndex < tasks.length) {
      await new Promise((resolve) => {
        // 跳转后 settigns.videoLoadTime 开始
        setTimeout(async () => {
          // 选中播放器 div 
          videoDiv = $(window.frames["0"].frames["0"])[0].document.childNodes[1].childNodes[3].childNodes[8].childNodes[0];
          
          // 如果视频处于暂停状态，点击开始
          let timeId = setInterval(() => {
            if(videoDiv.childNodes[6].childNodes[0].title === '播放')
              videoDiv.childNodes[6].childNodes[0].click()
          }, 1000);
          
          // 跳过 settings.jumpTitle
          if($('.prev_title')[0].title !== settings.jumpTitle)
            await finishTask();
          
          clearInterval(timeId);
          resolve();
        }, settings.videoLoadTime);
      })
      
      fromIndex = (fromIndex + 1) % tasks.length;
      switchTask(fromIndex);
    }
  });
})();