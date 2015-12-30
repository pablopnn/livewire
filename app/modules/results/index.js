/* global appSettings */

var
    $result,
    $resultContainer,
    $resultsButton,
    $resultsPane,
    $window = $(window),
    path = require('path'),
    _ = require('lodash'),
    isEnabled = true,

    messenger = require(path.resolve(__dirname, '../messenger')),
    renderer = require(path.resolve(__dirname, './asciidoc.js')).get(),
    formats = require(path.resolve(__dirname, '../formats')),

    source = '',
    shell = require('shell'),
    formatter = null,
    subscriptions = [],

    _fileInfo,
    _buildFlags = [];

var detectRenderer = function (fileInfo) {
    var rendererPath, currentFormatter;

    currentFormatter = formats.getByFileExtension(fileInfo.ext);

    if (formatter === null || currentFormatter.name !== formatter.name) {
        formatter = currentFormatter;
        rendererPath = path.resolve(__dirname, './' + formatter.name.toLowerCase());
        renderer = require(rendererPath).get();

        messenger.publish.file('formatChanged', formatter);
    }
};

var showRenderingMessage = function(){
    $result.html(appSettings.renderingMarkup());
};

var handlers = {
    newFile: function () {
        refreshSubscriptions();
        $result.animate({
            scrollTop: $result.offset().top
        }, 10);
    },
    opened: function(fileInfo){
        refreshSubscriptions();
        if(fileInfo.size >= appSettings.largeFileSizeThresholdBytes()){
            handlers.hideResults();
        } else {
            handlers.newFile();
        }
    },
    sourceChanged: function(fileInfo){
        debugger;
        //handlers.contentChanged(fileInfo);
        var flags = '', _fileInfo = fileInfo;
        detectRenderer(_fileInfo);
        source = _fileInfo.contents;

        _buildFlags.forEach(function (buildFlag) {
            flags += ':' + buildFlag + ':\n'
        });

        source = flags + source;
        
        renderer(source, function (e) {
            $result.html(e.html);
        });
    },
    contentChanged: function (fileInfo) {
        debugger;
        if (isEnabled && $result) {
            _fileInfo = fileInfo;
            
            showRenderingMessage();

            if (!_.isUndefined(_fileInfo)) {
                if (_fileInfo.isBlank) {
                    $result.html('');
                } else {
                    if(_fileInfo.contents.length > 0){            
                        var flags = '';
                        detectRenderer(_fileInfo);
                        source = _fileInfo.contents;

                        _buildFlags.forEach(function (buildFlag) {
                            flags += ':' + buildFlag + ':\n'
                        });

                        source = flags + source;
                        
                        renderer(source, function (e) {
                            $result.html(e.html);
                        });
                    }
                }
            }
        }
    },
    buildFlags: function (buildFlags) {
        _buildFlags = buildFlags;
        handlers.contentChanged(_fileInfo);
    },
    showResults: function() {
        showRenderingMessage();
        subscribe();
        $resultsPane.css('visibility', 'visible');
        
        $resultsButton
            .removeClass('fa-chevron-right')
            .addClass('fa-chevron-left')
            .one('click', handlers.hideResults);
            
        messenger.publish.layout('showResults');
    },
    hideResults: function () {
        unsubscribe();
        //$result.html(appSettings.renderingMarkup());
        $resultsPane.css('visibility', 'hidden');
        
        $resultsButton
            .removeClass('fa-chevron-right')
            .addClass('fa-chevron-left')
            .one('click', handlers.showResults);
            
        messenger.publish.layout('hideResults');        
    },
    fileSelected: function(){
        refreshSubscriptions();
    }
};

var subscribe = function () {
    isEnabled = true;
    subscriptions.push(messenger.subscribe.file('new', handlers.newFile));
    subscriptions.push(messenger.subscribe.file('opened', handlers.opened));
    subscriptions.push(messenger.subscribe.file('contentChanged', handlers.contentChanged));
    subscriptions.push(messenger.subscribe.file('sourceChange', handlers.sourceChanged));
    subscriptions.push(messenger.subscribe.format('buildFlags', handlers.buildFlags));  
};

var unsubscribe = function () {
    isEnabled = false;
    subscriptions.forEach(function (subscription) {
        messenger.unsubscribe(subscription);
    });
    subscriptions = [];
};

var refreshSubscriptions = function(){
    unsubscribe();
    subscribe();
};

subscribe();

messenger.subscribe.file('selected', handlers.fileSelected);
messenger.subscribe.file('rerender', function (data, envelope) {
    renderer(source, function (e) {
        $result.html(e.html);
    });
});

var openExternalLinksInBrowser = function (e) {
    var href;
    var element = e.target;

    if (element.nodeName === 'A') {
        href = element.getAttribute('href');
        shell.openExternal(href);
        e.preventDefault();
    }
};

document.addEventListener('click', openExternalLinksInBrowser, false);

var setHeight = function (offSetValue) {
    $resultsPane.css('height', $window.height() - offSetValue + 'px');
    $window.on('resize', function (e) {
        $resultsPane.css('height', $window.height() - offSetValue + 'px');
    });
};

$(function () {
    $result = $('#result');
    $resultContainer = $('#result-container');
    $resultsPane = $('#result-pane');
    $resultsButton = $('#result-button');

    $resultsPane
        .css('left', appSettings.split())
        .css('width', appSettings.resultsWidth());
        
        
    $resultsButton.one('click', handlers.hideResults);

    setHeight(appSettings.editingContainerOffset());
});