/* global ace */
/// <reference path="../../../../typings/node/node.d.ts"/>
/// <reference path="../../../../typings/jquery/jquery.d.ts"/>

module = module.exports;

var 
  path = require('path'),
  messenger = require(path.resolve(__dirname, '../../messenger')),
  _ = require('lodash'),
  shell = require('shell'),
  
  editor = null,
  selectedPath = '',

  $tabsContainer = $('#lw-tabs'),  
  template = '<div class="lw-tab active" title="PATH"><span class="lw-name">NAME</span> <button class="lw-close" title="close" data-path="PATH"><i class="fa fa-times-circle-o"></i></button></div>';
  
var removeActiveClass = function(){
  $('.lw-tab').removeClass('active');
};

var clearSelection = function(){
  window.getSelection().empty();  
};

var escapePath = function(path){
  return path.replace(/\\/g, '_');
};

var bindTab = function($tab, fileInfo){
  $tab.attr('title', fileInfo.path);
  $tab.attr('data-escaped-path', escapePath(fileInfo.path));
  $tab.attr('id', fileInfo.id);
  $tab.find('span.lw-name').text(fileInfo.fileName);
  $tab.find('button.lw-close').attr('data-path', fileInfo.path);
};

var getFileInfoFromTab = function($tab){
  
  var 
    fileName = '', 
    filePath = '', 
    ext = '', 
    basePath = '';
  
  fileName = $tab.find('span.lw-name').text();
  filePath = $tab.attr('title');
  
  if(filePath.length === 0){
    ext = path.extname(fileName);
  } else {
    basePath = path.dirname(filePath);
    ext = path.extname(filePath);
  }
  
  var fileInfo = {
    path: filePath,
    id: $tab.attr('id'),
    fileName: fileName,
    basePath: basePath,
    ext: ext
  }
  
  return fileInfo;
};

var handlers = {
  
  switchDocuments: function(e){
    var $tab, fileInfo, isTabSelected, cursorInfo;
    
    editor = ace.edit('editor');
    
    cursorInfo = {
      position: editor.selection.getCursor(),
      path: selectedPath
    };
    
    messenger.publish.file('beforeSelected', cursorInfo);
    
    $tab = $(this);
    isTabSelected = $tab.hasClass('active');
    
    if(!isTabSelected){
      removeActiveClass();
      
      $tab.addClass('active');
      
      fileInfo = getFileInfoFromTab($tab);
      
      selectedPath = fileInfo.path;
      
      messenger.publish.file('selected', fileInfo);
    }
    
  },
  
  openFileInExplorerOrFinder: function(e){
    var filePath; 
    
    clearSelection();
    filePath = $(this).attr('title');
    
    if(filePath.length > 0){
      shell.showItemInFolder(filePath);
    }
    
  },
  
  closeTab: function(e){
    var $btn, $tab, isTabSelected, fileInfo, openTabCount;
    
    e.stopPropagation();
    
    $btn = $(this);
    $tab = $btn.parents('.lw-tab');
    
    isTabSelected = $tab.hasClass('active');
    
    fileInfo = getFileInfoFromTab($tab);
    
    $btn.blur();
    $tab.remove();
    
    if(isTabSelected){
      setTimeout(function() {
        $('.lw-tab').last().trigger('click');
      }, 5);
    }
    
    messenger.publish.file('closed', fileInfo);
    
    openTabCount = $tabsContainer.find('.lw-tab').length;
    
    if(openTabCount === 0){
      messenger.publish.file('allFilesClosed', fileInfo);
    }
  },
  
  pathChanged: function (fileInfo, envelope) {
    var $tab, useActiveTab;
    
    if (!_.isUndefined(fileInfo.path)) {
      
      selectedPath = fileInfo.path;
      useActiveTab = fileInfo.isSaveAs;
      
      if(fileInfo.isFileAlreadyOpen){
        $tab = $tabsContainer.find('div[data-escaped-path="' + escapePath(fileInfo.path) + '"]');
        $tab.trigger('click');      
      } else if(useActiveTab){
        $tab = $tabsContainer.find('.active');
        bindTab($tab, fileInfo);
      } else {
        removeActiveClass();
        $tab = $(template);
        bindTab($tab, fileInfo);
        $tabsContainer.append($tab); 
      }
    }
  }
};

$tabsContainer.on('click', '.lw-close', handlers.closeTab);
$tabsContainer.on('dblclick', '.lw-tab', handlers.openFileInExplorerOrFinder);
$tabsContainer.on('click', '.lw-tab', handlers.switchDocuments);

messenger.subscribe.file('pathChanged', handlers.pathChanged);