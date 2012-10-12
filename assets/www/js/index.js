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

var db_manager = {
		init: function () {
			this.db = window.openDatabase("memori_pg", "1.0", "memori_pg", 200000);
			this.db.transaction(this.create_tables, this.error, this.success);
		},
		
		create_tables: function (tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS ShareLog (id unique, created_at, emails, photos)');
		},
		
		insert_logs: function(logs) {
			this.db.transaction(function(tx) { db_manager._insert_logs(tx, logs) }, this.error, this.success);
		},
		
		_insert_logs: function(tx, logs) {			
			logs.forEach(function (val, idx) {
				console.log(val['id']);
				tx.executeSql('INSERT INTO ShareLog (id, created_at, emails, photos) VALUES (?, ?, ?, ?)',
						[val['id'], val['created_at'], val['emails'], val['photos'].join()]);
			});
		},
		
		get_logs: function() {
			this.db.transaction( function(tx) { 
				tx.executeSql('SELECT * FROM ShareLog', [], db_manager._get_logs, db_manager.error); 
			}); 		
		},
		
		_get_logs: function(tx, ret) {
			var len = ret.rows.length;
			var $lst = $("#lst_records");
			$lst.empty();
		    for (var i=0; i<len; i++){				
				$lst.append('<li><a href="' + url_www + 'share/email/' + 
					ret.rows.item(i).id + '/">' + 
					ret.rows.item(i).created_at + '</a></li>');						    
		    }
		    $lst.listview('refresh');
		},
		
	    error: function error(err) {	    	
	        console.log("error " + err.code + ": " + err.message);
	    },
	    
	    success: function success() {
	    	console.log("success");
	    }
};
db_manager.init();
db_manager.get_logs();

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
		var next = api_shared_item_by_me;
		while ( next != false ) {
		$.ajax({
			url: url_api + next,
			type: "GET",
			dataType: "json",
			cache: false,
			async: false,
			headers: {"AUTHORIZATION": "Bearer " + ls.getItem("m_token")},
			success: function (data) {				
				if ( data['meta']['total_count'] == 0 ) {
					alert("You have no share log!");
					next = false;
					return;
				}				
				
				db_manager.insert_logs(data['objects']);				
				
				if ( data['meta']['next'] != null ) {
					next = data['meta']['next'];
				} else {
					next = false;
				}
			}
			});
		db_manager.get_logs();
		}
	});
});
