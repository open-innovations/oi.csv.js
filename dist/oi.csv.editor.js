/**
	Open Innovations tool for editing CSV files in the browser
	Version 0.2
 */
/*jshint esversion: 6 */
(function(root){

	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	// Add default CSS
	var styles = document.createElement('style');
	styles.innerHTML = `
	.oi-viz-table-holder { overflow: auto; max-width: 100%; max-height: 80vh; --hover: rgba(249, 188, 38,0.4); --select: rgba(11, 87, 208, 0.2); --select-hover: rgba(11, 87, 208, 0.4); --select-border: rgba(11, 87, 208, 1); }
	.oi-viz-table { border-collapse: separate; }
	.oi-viz-table td { border-top: 0; }
	.oi-viz-table td, .oi-viz-table th { border-right: 0; }
	.oi-viz-table thead { position: sticky; top: 0; }
	.oi-viz-table th, .oi-viz-table td { border-color: silver; }
	.oi-viz-table tr:hover { background: var(--hover); }
	.oi-viz-table th, .oi-viz-table td.row { cursor: pointer; }
	.oi-viz-table th > div { display: flex; align-items: center; position: relative; }
	.oi-viz-table th .heading { display: inline-block; cursor: text; padding-inline: 0.25em; flex-grow: 1; }
	.oi-viz-table th .menu { width: 1em; height: 1em; line-height:1em; border-radius: 100%; background: rgba(0,0,0,0.1); }
	.oi-viz-table th .menu:focus { outline: 2px solid var(--select-border); }
	.oi-viz-table .selected { background: var(--select); }
	.oi-viz-table .selected:hover { background: var(--select-hover); }
	.oi-viz-table-holder { position: relative; }
	.oi-viz-table-holder ul[role=menu] { position: relative; z-index: 1100; list-style: none; margin: 0; padding: 4px; list-style: none; display: flex; flex-wrap: wrap; box-sizing: border-box; gap: 4px; background: #efefef; border: 1px solid rgba(0,0,0,0.3); border-radius: 4px; position: absolute; top: 0; left: 0; flex-direction: column; min-width: 192px; box-shadow: 1px 1px 4px rgba(0,0,0,0.2); }
	.oi-viz-table-holder li[role=menuitem] { white-space: nowrap; display:block; cursor: pointer; background: transparent; }
	.oi-viz-table-holder li[role=menuitem] .button { cursor: pointer; width: 100%; line-height: 1rem; margin-right: 1px; padding: 0.5em; text-align: left; display: flex; flex-direction: row; gap: 0.5rem; align-items: center; }
	.oi-viz-table-holder li[role=menuitem] .button:focus { background: #222!important; color: #fff!important; cursor: auto; }
	.oi-viz-table-holder li[role=menuitem] .button svg { height: 1rem; width: 1rem; }
	.oi-viz-table-holder li[role=menuitem] .button .key { flex-grow: 1; text-align: right; color: #80868b; font-weight: bold; }
	.oi-viz-table-holder li[role=menuitem] .button:disabled, .oi-viz-table-holder li[role=menuitem] .button:disabled > * { opacity: 0.6; color: inherit!important; }
	.oi-viz-table-holder li.separator { line-height: 0; border: 0; border-top: 1px solid rgba(0,0,0,0.3); }
	`;
	document.head.prepend(styles);

	OI.CSVEditor = function(lnk,opts){
		var n,v,raw,msg,_url,el,loading,table,menu,holder,_obj,_open = false;
		if(!opts) opts = {};

		n = "OI CSVEditor";
		v = "0.2";
		msg = new OI.logger(n+' v'+v,{});
		msg.info('Init',lnk);
		_obj = this;

		if(lnk.tagName=="A") _url = lnk.getAttribute('href');
		var _original = lnk.innerHTML;

		// Add a note after
		this.open = function(){
			_open = true;
			if(!opts._getdata) _url = null;
			this.loadData();
			if(opts.collapse) lnk.innerHTML = opts.collapse;
			if(holder) holder.style.display = "";
		};
		this.close = function(){
			_open = false;
			msg.info('Close CSV');
			lnk.innerHTML = _original;
			if(holder) holder.style.display = "none";
		};
		this.toggle = function(){
			if(_open) this.close();
			else this.open();
		};
		this.setFocus = function(i){
			var col = table.querySelector('[data-col="'+i+'"]');
			if(col) col.querySelector('.menu').focus();
			return this;
		};
		this.delete = function(){
			var c,r,changes = 0,lastdel = -1;
			// Delete any rows
			for(r = this.selected.row.length-1; r >= 0; r--){
				if(this.selected.row[r]){
					// Delete row in data
					this.data.splice(r-1,1);
					this.selected.row.splice(r,1);
					changes++;
				}
			}
			for(c = this.selected.col.length-1; c >= 0; c--){
				if(this.selected.col[c]){
					// Delete column in data rows
					for(r = 0; r < this.data.length; r++) delete this.data[r].values[this.order[c-1].value];
					// Delete column in order
					this.order.splice(c-1,1);
					this.selected.col.splice(c,1);
					lastdel = c;
					changes++;
				}
			}
			if(changes > 0){
				this.updateTable();
			}
			return this;
		};
		this.toggleSelect = function(dir,i,shift,ctrl){
			var j,d;
			if(!shift){
				if(!ctrl){
					for(d in this.selected){
						for(j = 0; j < this.selected[dir].length; j++){
							if(j!==i) this.selected[dir][j] = false;
						}
					}
				}
				this.selected[dir][i] = !this.selected[dir][i];
			}else{
				// Shift is pressed so select from last selection to current
			}
			return this.updateSelection();
		};
		this.select = function(dir,i,shift,ctrl){
			this.selected[dir][i] = true;
			return this.updateSelection();
		};
		this.deselect = function(dir,i){
			this.selected[dir][i] = false;
			return this.updateSelection();
		};
		this.deselectAll = function(){
			var dir,j;
			for(dir in this.selected){
				for(j = 0; j < this.selected[dir].length; j++){
					this.selected[dir][j] = false;
				}
			}
			return this.updateSelection();
		};
		this.updateSelection = function(){
			var colgroup,group,c,r,tr;
			if(table){
				// Update column styles
				colgroup = table.querySelector('colgroup');
				if(!colgroup){
					colgroup = document.createElement('colgroup');
					table.prepend(colgroup);
				}
				// First column is for row indicator
				group = '<col></col>';
				for(c = 0; c < this.selected.col.length; c++){
					group += (this.selected.col[c+1]) ? '<col class="selected selected-col"></col>' : '<col></col>';
				}
				colgroup.innerHTML = group;
				// Update row styles
				for(r = 0; r < this.selected.row.length; r++){
					tr = table.querySelector('[data-row="'+r+'"]');
					if(tr){
						if(this.selected.row[r]) tr.classList.add('selected','selected-row');
						else tr.classList.remove('selected','selected-row');
					}
				}
			}
			return this;
		};
		this.loadData = function(){
			var url,m;
			if(_url){
				url = _url;
				if(typeof raw==="undefined" && !loading){
					m = url.match("https://docs.google.com/spreadsheets/d/([^\/]*)");
					if(m) url = "https://docs.google.com/spreadsheets/d/"+m[1]+"/gviz/tq?tqx=out:csv";
					msg.info('Loading %c'+url+'%c','font-style:italic;color:#2254F4;','');
					loading = true;
					fetch(url,{}).then(response => {
						if(!response.ok) throw new Error('Network response was not OK');
						return response.text();
					}).then(txt => {
						loading = false;
						this.processData(txt);
					}).catch(e => {
						msg.error('There has been a problem loading CSV data from <em>%c'+url+'%c</em>. It may not be publicly accessible or have some other issue.','font-style:italic;','font-style:normal;');
					});
				}else{
					msg.info('Already got data');
				}
			}else{
				var a = lnk;
				if(typeof raw==="undefined"){
					if(opts.src && document.getElementById(opts.src)){
						a = document.getElementById(opts.src);
						a.addEventListener('change',function(e){
							// Update the data
							_obj.updateData(e.target.value);
						});
					}
					raw = a.value||a.innerHTML;
					this.processData(raw);
				}
			}
			return this;
		};
		this.processData = function(txt){
			raw = txt;
			if(opts.target && document.getElementById(opts.target)){
				el = document.getElementById(opts.target);
			}
			if(!el){
				el = document.createElement('div');
				lnk.after(el);
			}
			el.classList.add('result');
			el.innerHTML = 'Got data from '+(_url||"local")+' <pre>'+raw+'</pre>';
			return this.updateData(raw);
		};
		this.updateData = function(csv){
			var o,r,c,data;
			this.data = CSV2JSON(csv);
			// Reshape the data
			data = new Array(this.data.length);
			for(r = 0; r < this.data.length; r++) data[r] = this.data[r].cols;
			for(r = 0; r < data.length; r++) data[r] = {'values':data[r]};
			this.order = [];
			for(c = 0; c < this.data[0].order.length; c++){
				o = {'value':this.data[0].order[c]};
				this.order.push(o);
			}
			this.data = data;
			this.selected = {'row':new Array(this.data.length),'col':new Array(this.order.length)};
			this.updateTable();
			return this;
		};
		this.sortBy = function(dir,i,asc){
			if(dir=="col"){
				var o = this.order[i-1].value;
				this.data = this.data.sort((a,b)=>{
					var a2,b2;

					// If we have values for only one cell we return
					if(a.values[o]=="" && b.values[o]) return 1;
					if(b.values[o]=="" && a.values[o]) return -1;

					// Check if numeric, string-like or date-like
					a2 = parseFloat(a.values[o]);
					b2 = parseFloat(b.values[o]);

					if(a2==a.values[o] && b2==b.values[o]){
						// Keep as numbers
					}else{
						a2 = new Date(a.values[o]);
						b2 = new Date(b.values[o]);
						if(isNaN(a2) || isNaN(b2)){
							// Back to strings
							a2 = a.values[o].toUpperCase();
							b2 = b.values[o].toUpperCase();
						}
					}
					if(a2 < b2) return (asc ? 1 : -1);
					if(a2 > b2) return (asc ? -1 : 1);
					return 0;
				});
				this.updateTable();
			}
			return this;
		};
		this.shiftBy = function(dir,c,by){
			c--;
			// Need to reorder the columns
			var newc = c+by;
			if(newc<0) newc = 0;
			if(newc>=this.order.length) newc = this.order.length-1;
			this.order.splice(newc, 0, this.order.splice(c, 1)[0]);
			this.updateTable();
			return this;
		};
		this.updateTable = function(){
			var c,r,th,tr,nc,html;

			if(!table){
				el.innerHTML = '<div class="oi-viz-table-holder"><table class="oi-viz-table"></table></div>';
				table = el.querySelector('table');
				holder = el.querySelector('.oi-viz-table-holder');
			}

			html = '';
			if(this.data.length > 0){
				th = '<th class="row"></th>';
				nc = this.order.length;
				for(c = 0; c < nc; c++){
					th += '<th data-col="'+(c+1)+'"><div><span class="heading" tabindex="0" contenteditable>'+this.order[c].value+'</span><span class="menu" tabindex="0"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg></span></div></th>';
				}
				html += '<thead><tr data-row="0">'+th+'</tr></thead><tbody>';
				for(r = 0; r < this.data.length; r++){
					tr = '<td class="row" tabindex="0">'+(r+1)+'</td>';
					for(c = 0; c < nc; c++){
						tr += '<td data-col="'+(c+1)+'" contenteditable>'+this.data[r].values[this.order[c].value]+'</td>';
					}
					html += '<tr data-row="'+(r+1)+'">'+tr+'</tr>';
				}
				html += '</tbody>';

				table.innerHTML = html;
				table.querySelectorAll('th').forEach(function(el,i){
					el.addEventListener('click',function(e){ if(el==e.originalTarget){ _obj.toggleSelect("col",getCol(el),e.shiftKey,e.ctrlKey); } });
				});
				table.querySelectorAll('th .heading').forEach(function(el,i){
					el.addEventListener('keydown',function(e){ if(e.key=="Enter"){ e.preventDefault(); _obj.toggleSelect("col",getCol(el),e.shiftKey,e.ctrlKey); } });
				});
				table.querySelectorAll('th .menu').forEach(function(el,i){
					el.addEventListener('click',function(e){ if(e.target==el || el==e.target.closest('.menu')){ _obj.toggleMenu(el); } });
					el.addEventListener('keypress',function(e){ if(e.key === "Enter" && e.target==el){ e.preventDefault(); el.click(); } });
				});
				table.querySelectorAll('td.row').forEach(function(el,i){
					el.addEventListener('click',function(e){ _obj.toggleSelect("row",getRow(el),e.shiftKey,e.ctrlKey); });
					el.addEventListener('keydown',function(e){ if(e.key=="Enter"){ e.preventDefault(); _obj.toggleSelect("row",getRow(el),e.shiftKey,e.ctrlKey); } });
				});
				table.addEventListener('focusout',function(e){
					_obj.updateByDom(e.target);
				});

				menu = new Menu('column-menu',holder,[{
					'type':'button',
					'id':'btn-select-column',
					'title':'Select column',
					'icon': '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M2,7v-2h5v-5h2v5h5v2h-5v5h-2v-5z"/></svg>',
					'this': this,
					'fn': function(el){
						var c = getCol(el);
						this.select("col",c,false,false);
						this.setFocus(c);
					}
				},{
					'type':'button',
					'id':'btn-deselect-column',
					'title':'Deselect column',
					'icon': '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M2,7v-2h12v2h-12z"/></svg>',
					'this': this,
					'fn': function(el){
						var c = getCol(el);
						this.deselect("col",c,false,false);
						this.setFocus(c);
					}
				},{
					'type':'separator'
				},{
					'type':'button',
					'id':'btn-sort-a-z-column',
					'title':'Sort table (increasing)',
					'icon': '<path d="M4,2h1.5v9l1,-1 1,1 -2.75,3 -2.75,-3 1,-1 1,1 v-9zM8.5,7.5 l2,-5.5h1l2,5.5h-1.5l-0.5,-1.5h-1.5l-0.5,1.5h-1.5m2,-2.5h1l-0.5,-1l-0.5,1zM9,8.5h4.5v1.5l-3,2.5h3v1.5h-4.5v-1.5l3,-2.5h-3v-1.5z"/>',
					'this': this,
					'fn': function(el){
						var c = getCol(el);
						this.sortBy("col",c,false);
					}
				},{
					'type':'button',
					'id':'btn-sort-z-a-column',
					'title':'Sort table (decreasing)',
					'icon': '<path d="M4,2h1.5v9l1,-1 1,1 -2.75,3 -2.75,-3 1,-1 1,1 v-9zM8.5,14 l2,-5.5h1l2,5.5h-1.5l-0.5,-1.5h-1.5l-0.5,1.5h-1.5m2,-2.5h1l-0.5,-1l-0.5,1zM9,2h4.5v1.5l-3,2.5h3v1.5h-4.5v-1.5l3,-2.5h-3v-1.5z"/>',
					'this': this,
					'fn': function(el){
						var c = getCol(el);
						this.sortBy("col",c,true);
					}
				},{
					'type':'separator'
				},{
					'type':'button',
					'id':'btn-shift-left-column',
					'title':'Move column left',
					'icon': '<path d="M2,8l3,-2.75 1,1 -1,1h9v1.5h-9l1,1 -1,1z"/>',
					'this': this,
					'fn': function(el){
						var c = getCol(el);
						this.shiftBy("col",c,-1);
					}
				},{
					'type':'button',
					'id':'btn-shift-right-column',
					'title':'Move column right',
					'icon': '<path d="M2,7.25h9l-1,-1 1,-1 3,2.75 -3,2.75 -1,-1 1,-1h-9v-1.5z"/>',
					'this': this,
					'fn': function(el){
						var c = getCol(el);
						this.shiftBy("col",c,1);
					}
				},{
					'type':'separator'
				},{
					'type':'button',
					'id':'btn-delete-column',
					'title':'Delete column',
					'icon': '<path d="M1,2h5v-1h4v1h5v1.5h-1v11.5h-12v-11.5h1.5v10h9v-10h-11.5M5.5,5h1.5v7h-1.5v-7M9,5h1.5v7h-1.5v-7z"/>',
					'this': this,
					'fn': function(el){
						this.deselectAll();
						var c = getCol(el);
						this.select("col",c,false,false);
						this.delete();
						this.setFocus(c);
					}
				}]);
			}else{
				msg.log('No data loaded.');
			}
			this.updateCSV();
			return this;
		};
		this.updateByDom = function(e){
			var pos = getPos(e);
			var r,nc,old,update = false,v;
			if(e.classList.contains('menu')) v = e.closest('th').querySelector('.heading').innerHTML;
			else v = e.innerHTML;
			if(isNaN(pos.row) || isNaN(pos.col)) return this;
			// 0-index
			pos.row--;
			pos.col--;
			if(pos.row==-1){
				// Need to update the order and all the rows
				old = this.order[pos.col].value;
				if(old != v){
					update = true;
					this.order[pos.col].value = v;
					nc = this.order.length;
					// Loop over data and rename variables
					for(r = 0; r < this.data.length; r++){
						this.data[r].values[v] = this.data[r].values[old];
						delete this.data[r].values[old];
					}
					this.updateCSV();
				}
			}else{
				if(this.data[pos.row].values[this.order[pos.col].value] != v){
					update = true;
					this.data[pos.row].values[this.order[pos.col].value] = v;
					this.updateCSV();
				}
			}
			return this;
		};
		this.updateCSV = function(){
			this._csv = this.buildCSV();
			
			// Update original source
			if(opts.src && document.getElementById(opts.src)){
				var a = document.getElementById(opts.src);
				a.value = this._csv;
			}

			return this;
		};
		this.buildCSV = function(){
			var csv = '',c,r,v,needsquotes;
			for(c = 0; c < this.order.length; c++){
				csv += (c > 0 ? ',':'')+this.order[c].value;
			}
			csv += '\n';
			for(r = 0; r < this.data.length; r++){
				for(c = 0; c < this.order.length; c++){
					v = this.data[r].values[this.order[c].value];
					needsquotes = (typeof v==="string" && v.indexOf(",")>=0);
					csv += (c > 0 ? ',':'')+(needsquotes ? '"':'')+this.data[r].values[this.order[c].value]+(needsquotes ? '"':'');
				}
				csv += '\n';
			}
			return csv;
		};
		this.toggleMenu = function(e){
			return menu.toggle(e);
		};
		addEventListener('keydown',function(e){
			if(e.key=="Delete") _obj.delete();
		});
		return this;
	};

	function getRow(el){ return parseInt((el.hasAttribute('data-row') ? el : el.closest('[data-row]')).getAttribute('data-row')); }
	function getCol(el){ var cel = (el.hasAttribute('data-col') ? el : el.closest('[data-col]'))||el; return parseInt(cel.getAttribute('data-col')); }
	function getPos(el){ return {'col':getCol(el),'row':getRow(el)}; }

	function Menu(id,holder,items){
		var ul = document.createElement('ul');
		ul.setAttribute('role','menu');
		ul.style.display = "none";
		ul.id = id;
		holder.appendChild(ul);
		this.get = function(){ return ul; };
		this.addItems = function(items){
			var i,a;
			for(i = 0; i < items.length; i++) a = new MenuItem(this,items[i]);
			return this;
		};
		this.show = function(){
			ul.style.display = "";
			return this;
		};
		this.hide = function(){
			ul.style.display = "none";
			this.el = null;
			return this;
		};
		this.toggle = function(el){
			if(el!=this.el) this.show();
			else{
				if(ul.style.display=="") this.hide();
				else this.show();
			}
			el.after(ul);
			this.el = el;
			this.setPosition();
			return this;
		};
		this.setPosition = function(){
			ul.style.left = "100%";
			ul.style.top = "100%";
			ul.style.transform = "translate3d(-1em,0,0)";
			var bb = ul.getBoundingClientRect();
			var bbh = holder.getBoundingClientRect();
			if(bb.left+bb.width > holder.offsetWidth+bbh.left) ul.style.transform = 'translate3d(-100%,0,0)';
			return this;
		};
		this.addItems(items);
		return this;
	}

	function MenuItem(menu,opt){
		var _obj = this, ul = menu.get(), li = document.createElement('li'), btn;
		if(opt.type=="button"){
			li.setAttribute('role','menuitem');
			li.setAttribute('aria-label',opt.title);
			btn = document.createElement('button');
			btn.setAttribute('id',opt.id);
			btn.classList.add('button');
			btn.setAttribute('tabindex','0');
			btn.innerHTML = (opt.icon ? '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">'+opt.icon+'</svg>' : '')+'<span class="label">'+opt.title+'</span>'+(opt.key ? '<span class="key">'+opt.key.label+'</span>' : '');
			if(typeof opt.fn==="function"){
				btn.addEventListener('click',function(e){
					e.preventDefault();
					opt.fn.call(opt['this']||_obj,menu.el);
					menu.hide();
				});
			}
			if(opt.key && typeof opt.key.fn==="function"){
				addEventListener('keydown',function(e){
					if(e.key==opt.key.label){
						opt.key.fn.call(opt['this']||_obj,menu.el);
						menu.hide();
					}
				});
			}
			li.appendChild(btn);
		}else if(opt.type=="separator"){
			li.classList.add('separator');
		}
		ul.appendChild(li);
		this.li = li;
		this.opt = opt;
		return this;
	}

	if(!OI.logger){
		// Console version 1.5
		OI.logger = function(title,attr){
			if(!attr) attr = {};
			title = title||"OI Logger";
			this.logging = (location.search.indexOf('debug=true') >= 0);
			if(console && typeof console.log==="function"){
				this.log = function(){ if(this.logging){ console.log.apply(null,getParam(arguments)); } };
				this.info = function(){ console.info.apply(null,getParam(arguments)); };
				this.warn = function(){ console.warn.apply(null,getParam(arguments)); };
				this.error = function(){ console.error.apply(null,getParam(arguments)); };
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