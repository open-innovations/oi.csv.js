/**
	Open Innovations tool for editing CSV files in the browser
	Version 0.1
 */
(function(root){

	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	OI.CSVEditor = function(lnk){
		var n,v,raw,msg,_url,el,loading,table,_obj;

		n = "CSVEditor";
		v = "0.2";
		msg = new OI.logger(n+' v'+v,{el:document.getElementById('messages'),'visible':['info','warning','error'],'fade':60000,'class':'msg'});
		msg.info('Init',lnk);
		_obj = this;

		if(lnk.tagName=="A") _url = lnk.getAttribute('href');

		// Add a note after
		this.open = function(){
			console.log('Open CSV',this,lnk,this._url);
			this.loadData();
		};

		this.loadData = function(){
			var url,m;
			if(_url){
				url = _url;
				if(typeof raw==="undefined" && !loading){
					msg.info('Need to load CSV from'+url);
					m = url.match("https://docs.google.com/spreadsheets/d/([^\/]*)");
					if(m) url = "https://docs.google.com/spreadsheets/d/"+m[1]+"/gviz/tq?tqx=out:csv";
					msg.info('Loading '+url);
					loading = true;
					fetch(url,{}).then(response => {
						if(!response.ok) throw new Error('Network response was not OK');
						return response.text();
					}).then(txt => {
						raw = txt;
						loading = false;
						this.processData();
					}).catch(e => {
						msg.error('There has been a problem loading CSV data from <em>%c'+url+'%c</em>. It may not be publicly accessible or have some other issue.','font-style:italic;','font-style:normal;');
					});
				}else{
					msg.info('Already got data');
				}
			}
			return this;
		};

		this.processData = function(){
			if(!el){
				el = document.createElement('div');
				el.classList.add('result');
				lnk.after(el);
			}
			el.innerHTML = 'Got data from '+_url+' <pre>'+raw+'</pre>';
			this.buildOutput(raw);
	//		this.buildOutput(txt);
	//		this.toggleOpenDialog();
			return this;
		};

		this.buildOutput = function(csv){
			this.data = CSV2JSON(csv);
			msg.info('Build output',this.data);

//			var el = document.getElementById('msg-start-edit');
//			if(el) el.innerHTML = '';

			// Reshape the data
			var data = new Array(this.data.length);
			for(r = 0; r < this.data.length; r++) data[r] = this.data[r].cols;

console.log(data);
			// Update the table
			this.updateData(data,this.data[0].order);

//			document.getElementById('geography-add').disabled = false;
			return this;
		};

		this.updateData = function(data,order){
			var c,r,th,tr,nc,html;
			msg.info("updateData",el,data,order);
			if(!table){
				el.innerHTML = '<div class="table-holder"><table></table></div>';
				table = el.querySelector('table');
			}
			this.order = order;
			this.data = data;

			html = '';

			console.log('here');

			if(this.data.length > 0){
				th = '<th class="row"></th>';
				nc = this.order.length;
				for(c = 0; c < nc; c++){
					th += '<th data="'+(c+1)+'" tabindex="0" contenteditable>'+this.order[c]+'</th>';
				}
				html += '<tr data="0">'+th+'</tr>';
				for(r = 0; r < this.data.length; r++){
					tr = '<td class="row" tabindex="0">'+(r+1)+'</td>';
					for(c = 0; c < nc; c++){
						tr += '<td data="'+(c+1)+'" contenteditable>'+this.data[r][this.order[c]]+'</td>';
					}
					html += '<tr data="'+(r+1)+'">'+tr+'</tr>';
				}

				table.innerHTML = html;
				table.querySelectorAll('th').forEach(function(el,i){
					el.addEventListener('click',function(e){ _obj.select("cols",parseInt(el.getAttribute('data')),e.shiftKey,e.ctrlKey); });
					el.addEventListener('keydown',function(e){ if(e.key=="Enter"){ e.preventDefault(); _obj.select("cols",parseInt(el.getAttribute('data')),e.shiftKey,e.ctrlKey); } });
				});
				table.querySelectorAll('td.row').forEach(function(el,i){
					el.addEventListener('click',function(e){ _obj.select("rows",parseInt(el.parentNode.getAttribute('data')),e.shiftKey,e.ctrlKey); });
					el.addEventListener('keydown',function(e){ if(e.key=="Enter"){ e.preventDefault(); _obj.select("rows",parseInt(el.getAttribute('data')),e.shiftKey,e.ctrlKey); } });
				});
				table.addEventListener('input',function(e){
					_obj.updateByDom(e.target);
					if(typeof opts.edit==="function") opts.edit.call(this);
				});

			}else{
				msg.log('No data loaded.');
			}
			//this.findEmptyRows();
			//this.update();
			if(typeof opts.load==="function") opts.load.call(this);
			return this;
		};

		return this;
	}

	if(!OI.logger){
		// Version 1.5
		OI.logger = function(title,attr){
			if(!attr) attr = {};
			title = title||"OI Logger";
			var ms = {};
			this.logging = (location.search.indexOf('debug=true') >= 0);
			if(console && typeof console.log==="function"){
				this.log = function(){ if(this.logging){ console.log.apply(null,getParam(arguments)); updatePage('log',arguments); } };
				this.info = function(){ console.info.apply(null,getParam(arguments)); updatePage('info',arguments); };
				this.warn = function(){ console.warn.apply(null,getParam(arguments)); updatePage('warning',arguments); };
				this.error = function(){ console.error.apply(null,getParam(arguments)); updatePage('error',arguments); };
			}
			this.remove = function(id){
				var el = attr.el.querySelector('#'+id);
				if(ms[id]) clearTimeout(ms[id]);
				if(el) el.remove();
			};
			function updatePage(){
				if(attr.el){
					var id, el, visible = false;
					var cls = arguments[0];
					var txt = Array.prototype.shift.apply(arguments[1]);
					var opt = arguments[1]||{};
					if(opt.length > 0) opt = opt[opt.length-1];
					if(attr.visible.includes(cls)) visible = true;
					if(visible){
						id = "default";
						if(opt.id) id = opt.id;
						el = document.getElementById(id);
						if(!el){
							el = document.createElement('div');
							el.classList.add('message',cls);
							el.setAttribute('id',id);
						}
						if(attr.class) el.classList.add(...attr.class.split(/ /));
						el.innerHTML = '<div class="message-inner">'+txt.replace(/\%c/g,"")+'</div>';
						el.style.display = (txt ? '' : 'none');
						attr.el.prepend(el);
						var cls = document.createElement('div');
						cls.setAttribute('tabindex',0);
						cls.classList.add('close');
						cls.innerHTML = '&times;';
						cls.addEventListener('click',function(e){ clearTimeout(ms[id]); el.remove(); });
						el.appendChild(cls);
						ms[id] = setTimeout(function(){ el.remove(); },(typeof opt.fade==="number" ? opt.fade : (typeof attr.fade==="number" ? attr.fade : 10000)));
					}
				}
			}
			function getParam(){
				var a = Array.prototype.slice.call(arguments[0], 0);
				var str = (typeof a[0]==="string" ? a[0] : "");
				// Build basic result
				var ext = ['%c'+title+'%c: '+str.replace(/<[^\>]*>/g,""),'font-weight:bold;',''];
				var n = (str ? 1 : 0);
				// If there are extra parameters passed we add them
				return (a.length > n) ? ext.concat(a.splice(n)) : ext;
			}
			return this;
		};
	}

	// Simple CSV to JSON parser v3.2
	function CSV2JSON(str,opts){
		// Convert \r\n to \n, remove final newline, and split by newlines
		var lines = str.replace(/[\n\r]{2}/g,"\n").replace(/[\n\r]+$/g,"").split(/\n/);
		var header = [],cols,i,c,data = [],datum,v;
		for(i = 0; i < lines.length; i++){
			cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
			if(i==0){
				header = cols;
				for(c = 0; c < header.length; c++) header[c] = cols[c].replace(/(^\"|\"$)/g,"");
			}else{
				datum = {'order':header,'cols':{}};
				for(c = 0; c < header.length; c++){
					v = cols[c].replace(/(^\"|\"$)/g,"");
					if(parseFloat(v)==v) v = parseFloat(v);
					if(v=="True" || v=="true") v = true;
					if(v=="False" || v=="false") v = false;
					datum.cols[header[c]] = v;
				}
				data.push(datum);
			}
		}
		return data;
	}

	root.OI = OI||root.OI||{};

})(window || this);