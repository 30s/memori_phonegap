/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

$.support.cors = true;

var cb = window.plugins.childBrowser;
var ls = window.localStorage;

var client_id = "500e29a921085c3e19000000";
//var url_www = "http://192.168.1.138:8000/";
//var url_api = "http://192.168.1.138:8000/";
var url_www = "http://www.memori.cn/";
var url_api = "http://api.memori.cn/";

var api_register_by_weibo = "v1/account/register_by_weibo/";
var api_shared_item_by_me = "v1/get/share/";

var memori_register_by_weibo = function () {
	$.post(url_api + api_register_by_weibo, 
			{
				"uid": ls.getItem("uid"),
				"screen_name": ls.getItem("screen_name"),
				"avatar": ls.getItem("avatar"),
				"token": ls.getItem("access_token"),
				"expires_in": ls.getItem("expires_in"),
				"client_id": client_id
			},
			function (info) {
				if ( info["error_code"] ) {
					alert(info["error_message"]);
				} else {
					ls.setItem("m_token", info["token"]);
					ls.setItem("m_uid", info["uid"]);
					ls.setItem("email_name", info["email_name"]);
					show_profile();
				}
			});	
};

var show_profile = function() {
	$("#login").hide();
	$("#email_name").text(ls.getItem("screen_name"));
	$("#avatar")[0].src = ls.getItem("avatar");
	$("#uid").text(ls.getItem("m_uid"));
	$("#profile").show();
};

$(document).bind('pageinit', function() {
	if ( ls.getItem("uid") != undefined ) {
		memori_register_by_weibo();
	}
	if ( ls.getItem("m_uid") != undefined ) {
		show_profile();
	}
	
	$("#btn_weibo_login").click(function() {
		cb.showWebPage("https://api.weibo.com/oauth2/authorize?client_id=866081245&display=mobile&response_type=token&redirect_uri=http://www.memori.cn/memori/connect/sina/callback", { showLocationBar: false });		
		cb.onLocationChange = function (loc){
			if ( loc.indexOf("access_token") != -1 ) { 
				ls.setItem("access_token", loc.substring(loc.indexOf("#access_token") + 14, loc.indexOf("&remind_in")));
				ls.setItem("expires_in", loc.substring(loc.indexOf("&remind_in") + 11, loc.indexOf("&expires_in")));
				ls.setItem("uid", loc.substring(loc.indexOf("&uid") + 5));

				$.get("https://api.weibo.com/2/users/show.json", 
						{"access_token": ls.getItem("access_token"), "uid": ls.getItem("uid")},
						function (info) {
							ls.setItem("screen_name", info["screen_name"]);
							ls.setItem("avatar", info["profile_image_url"]);
						});
				memori_register_by_weibo();				
				cb.close();
			}
		};
	});
	
	$("#btn_logout").click(function () {
		$("#profile").hide();
		$("#login").show();
	});
	
	$("#btn_records").click(function () {
		$.ajax({
			url: url_api + api_shared_item_by_me,
			type: "GET",
			dataType: "json",
			cache: false,
			headers: {"AUTHORIZATION": "Bearer " + ls.getItem("m_token")},
			success: function (data) {				
				if ( data['meta']['total_count'] == 0 ) {
					alert("You have no share log!");
					return;
				}
				
				var $lst = $("#lst_records");
				$lst.empty();
				data['objects'].forEach(function (val, idx) {
					$lst.append('<li><a href="' + url_www + 'share/email/' + val['id'] + '/">' + val['created_at'] + '</a></li>');
				});
				$lst.listview('refresh');
			}
			});
	});
});
