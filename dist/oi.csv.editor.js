/**
	Open Innovations tool for editing CSV files in the browser
	Version 0.2.2
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

	OI.CSVEditor = function(lnk,opts){
		if(!opts) opts = {};
		var n,v,raw,msg,_url,el,loading,table,menu,holder,wrapper,rows,_obj,_open = false,memory = [],_memory = 0;
		n = "OI CSVEditor";
		v = "0.2.2";
		msg = new OI.logger(n+' v'+v,{});
		msg.info('Init',lnk);
		_obj = this;

		if(lnk.tagName=="A") _url = lnk.getAttribute('href');
		var _original = lnk.innerHTML;
		this._focussed = false;

		this.clear = function(){
			// Clear the entire editor
			el.innerHTML = '';
			table = undefined;
			holder = undefined;
			wrapper = undefined;
			menubar = undefined;
			_open = false;
			loading = false;
			raw = "";
			memory = [];
			_memory = 0;
			this._focussed = false;
			return this;
		};
		this.reset = function(){
			return this.updateData(this._csvoriginal);
		};
		// Add a note after
		this.open = function(){
			_open = true;
			if(!opts._getdata) _url = null;
			this.loadData();
			if(opts.collapse) lnk.innerHTML = opts.collapse;
			if(wrapper) wrapper.style.display = "";
		};
		this.close = function(){
			_open = false;
			lnk.innerHTML = _original;
			if(wrapper) wrapper.style.display = "none";
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
		this.delete = function(dir,i){
			var c,r,changes = 0,selchange = 0,lastdel = -1;
			if(dir){
				if(dir=="col"){
					this.order.splice(i-1,1);
					this.selected.col.splice(i,1);
					changes++;
				}
			}else{
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
						// Delete column in order
						this.order.splice(c-1,1);
						this.selected.col.splice(c,1);
						lastdel = c;
						changes++;
					}
				}
			}
			if(changes > 0) this.updateTable();
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
					if(r < rows.length){
						if(this.selected.row[r]) rows[r].classList.add('selected','selected-row');
						else rows[r].classList.remove('selected','selected-row');
					}
				}
			}
			return this;
		};
		this.duplicate = function(dir,i){
			if(dir=="col"){
				this.deselectAll();
				// Make a new column
				var o = clone(this.order[i-1]);
				o.value += ' (Copy)';
				o.column = this.data[0].cols.length;
				this.order.splice(i,0,o);
				// Duplicate each row
				for(var r = 0; r < this.data.length; r++){
					this.data[r].cols.push(this.data[r].cols[this.order[i-1].column]||"");
				}
				this.updateTable();
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
			this._csvoriginal = (txt+(txt[txt-length-1]!="\n" ? "\n":"")).replace(/\r\n/g,"\n");
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
			var o,r,c,data,csvrows,head;
			csvrows = CSVToArray(csv);
			head = csvrows.splice(0,1)[0];
			data = new Array(csvrows.length);
			for(r = 0; r < csvrows.length; r++) data[r] = {'cols':csvrows[r]};
			this.order = [];
			if(head.length > 0){
				for(c = 0; c < head.length; c++){
					o = {'value':head[c],'column':c};
					this.order.push(o);
				}
			}
			this.data = data;
			this.selected = {'row':new Array(this.data.length),'col':new Array(this.order.length)};
			this.updateTable();
			return this;
		};
		this.sortBy = function(dir,i,asc){
			if(dir=="col"){
				var o = this.order[i-1].column;
				this.data = this.data.sort((a,b)=>{
					var a2,b2;

					// If we have values for only one cell we return
					if(a.cols[o]=="" && b.cols[o]) return 1;
					if(b.cols[o]=="" && a.cols[o]) return -1;

					// Check if numeric, string-like or date-like
					a2 = parseFloat(a.cols[o]);
					b2 = parseFloat(b.cols[o]);

					if(a2==a.cols[o] && b2==b.cols[o]){
						// Keep as numbers
					}else{
						a2 = new Date(a.cols[o]);
						b2 = new Date(b.cols[o]);
						if(isNaN(a2) || isNaN(b2)){
							// Back to strings
							a2 = a.cols[o].toUpperCase();
							b2 = b.cols[o].toUpperCase();
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
			if(dir=="col"){
				// Need to reorder the columns
				var newc = c+by;
				if(newc<0) newc = 0;
				if(newc>=this.order.length) newc = this.order.length-1;
				this.order.splice(newc, 0, this.order.splice(c, 1)[0]);
				this.updateTable();
			}
			return this;
		};
		this.strip = function(dir,c,regex){
			c--;
			if(dir=="col"){
				if(c >= 0 && c < this.order.length){
					for(var r = 0; r < this.data.length; r++){
						// Update value
						this.data[r].cols[this.order[c].column] = ((this.data[r].cols[this.order[c].column]||"")+"").replace(regex,'');
					}
					this.updateTable();
				}
			}
			return this;
		};
		this.updateTable = function(nosave){
			var c,r,th,tr,nc,html,menubar,i,sel;

			if(!table){
				el.innerHTML = '<div class="oi-viz-wrapper"><div class="oi-menu-bar"></div><div class="oi-viz-table-holder"><table class="oi-viz-table" aria-label="CSV"></table></div></div>';
				table = el.querySelector('table');
				holder = el.querySelector('.oi-viz-table-holder');
				wrapper = el.querySelector('.oi-viz-wrapper');
				menubar = el.querySelector('.oi-menu-bar');
				addButton(menubar,{'label':'Save','html':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M7.25,2h1.5v7h2l-2.75,3.5 -2.75,-3.5h2v-7zM1,15 v-4h1.5v3h11v-3h1.5v4h-14z" /></svg> Save','click':function(){ _obj.saveCSV(); }});
				addButton(menubar,{'label':'Undo','html':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M10,10h2.5l1,-1v-1l-1,-1h-6v2l-3.5,-2.75 3.5,-2.75v2h7l1.5,1.5v3l-1.5,1.5h-4z" /></svg> Undo','click':function(){_obj.loadMemory(1);}});
				addButton(menubar,{'label':'Redo','html':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M6,10h-2.5l-1,-1v-1l1,-1h6v2l3.5,-2.75 -3.5,-2.75v2h-7l-1.5,1.5v3l1.5,1.5h4z" /></svg> Redo','click':function(){_obj.loadMemory(-1);}});
				addButton(menubar,{'label':'Reset','html':'<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M2,8v-3l2,-2h8l2,2v6l-2,2h-3v2l-3.5,-2.75 3.5,-2.75v2h2.5l1,-1v-5l-1,-1h-7l-1,1v3z" /></svg> Reset','click':function(){_obj.reset();}});
				table.addEventListener('mouseover',function(){ _obj._focussed = true; });
				table.addEventListener('mouseout',function(){ _obj._focussed = false; });
			}

			html = '';
			if(this.order.length > 0){
				th = '<th scope="row"></th>';
				nc = this.order.length;
				for(c = 0; c < nc; c++){
					th += '<th scope="col" data-col="'+(c+1)+'"><div><span class="heading" tabindex="0" contenteditable>'+this.order[c].value+'</span><button class="menu" tabindex="0" aria-label="Column options"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg></button></div></th>';
				}
				html += '<thead><tr data-row="0">'+th+'</tr></thead><tbody>';
				for(r = 0; r < this.data.length; r++){
					tr = '<th scope="row" tabindex="0">'+(r+1)+'</th>';
					for(c = 0; c < nc; c++){
						tr += '<td data-col="'+(c+1)+'" contenteditable>'+this.data[r].cols[this.order[c].column]+'</td>';
					}
					html += '<tr data-row="'+(r+1)+'">'+tr+'</tr>';
				}
				html += '</tbody>';

				table.innerHTML = html;
				rows = table.querySelectorAll('tr');
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
				table.querySelectorAll('[scope=row]').forEach(function(el,i){
					el.addEventListener('click',function(e){ _obj.toggleSelect("row",getRow(el),e.shiftKey,e.ctrlKey); });
					el.addEventListener('keydown',function(e){ if(e.key=="Enter"){ e.preventDefault(); _obj.toggleSelect("row",getRow(el),e.shiftKey,e.ctrlKey); } });
				});
				table.addEventListener('focusout',function(e){
					_obj.updateByDom(e.target);
				});
				menu = (new Menu(holder)).addItems('select,deselect,sortup,sortdown,moveleft,moveright,duplicate,stripnonnumeric,separator,delete',this);
			}else{
				msg.log('No data loaded.');
			}
			this.updateCSV(nosave);
			sel = 0;
			for(i = 0; i < this.selected.col.length; i++){
				if(this.selected.col[i]) sel++;
			}
			if(sel > 0) this.updateSelection();
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
					this.updateCSV();
				}
			}else{
				if(this.data[pos.row].cols[this.order[pos.col].column] != v){
					update = true;
					this.data[pos.row].cols[this.order[pos.col].column] = v;
					this.updateCSV();
				}
			}
			return this;
		};
		this.updateCSV = function(nosave){
			this._csv = this.buildCSV();
			
			// Update original source
			if(opts.src && document.getElementById(opts.src)){
				var a = document.getElementById(opts.src);
				a.value = this._csv;
			}

			if(!nosave){
				// Store memory
				if(_memory > 0){
					// Remove any memory before the current location (like over-write)
					//memory = memory.slice(_memory,);
					console.log('remove memory',_memory);
				}
				// Store the current situation
				memory.unshift({'data':clone(this.data),'order':clone(this.order)});
				// Remove old steps
				if(memory.length > 20) memory = memory.slice(0,20);
			}
			return this;
		};
		this.buildCSV = function(){
			var csv = '',c,r,v,needsquotes;
			for(c = 0; c < this.order.length; c++){
				v = this.order[c].value;
				needsquotes = (typeof v==="string" && v.indexOf(",")>=0);
				csv += (c > 0 ? ',':'')+(needsquotes ? '"':'')+v+(needsquotes ? '"':'');
			}
			csv += '\n';
			for(r = 0; r < this.data.length; r++){
				for(c = 0; c < this.order.length; c++){
					v = this.data[r].cols[this.order[c].column];
					needsquotes = (typeof v==="string" && v.indexOf(",")>=0);
					csv += (c > 0 ? ',':'')+(needsquotes ? '"':'')+v+(needsquotes ? '"':'');
				}
				csv += '\n';
			}
			return csv;
		};
		this.saveCSV = function(){
			var file,type;
			file = _url||"data.csv";
			file = file.substring(file.lastIndexOf("\/")+1,);
			type = "text/csv";

			if(this._csv!=this._csvoriginal) file = file.replace(/\.csv/,'_modified.csv');

			var textFileAsBlob = new Blob([this._csv||""], {type:type});
			function destroyClickedElement(event){ document.body.removeChild(event.target); }
			var dl = document.createElement("a");
			dl.download = file;
			dl.innerHTML = "Download File";
			if(window.webkitURL != null){
				// Chrome allows the link to be clicked without actually adding it to the DOM.
				dl.href = window.webkitURL.createObjectURL(textFileAsBlob);
			}else{
				// Firefox requires the link to be added to the DOM before it can be clicked.
				dl.href = window.URL.createObjectURL(textFileAsBlob);
				dl.onclick = destroyClickedElement;
				dl.style.display = "none";
				document.body.appendChild(dl);
			}
			dl.click();
			return this;
		};
		this.toggleMenu = function(e){
			return menu.toggle(e);
		};
		this.loadMemory = function(delta){
			_memory += delta;
			if(_memory < 0){
				_memory = 0;
				delta = 0;
			}else if(_memory >= memory.length){
				_memory = memory.length-1;
				delta = 0;
			}
			if(delta != 0){
				// Load memory
				this.data = clone(memory[_memory].data);
				this.order = clone(memory[_memory].order);
				this.updateTable(true);
			}
			return this;
		};
		addEventListener('keydown',function(e){
			if(_obj._focussed){
				if(e.key=="Delete") _obj.delete();
				if(e.key.toLowerCase()=="z" && e.ctrlKey){
					_obj.loadMemory(e.shiftKey ? -1 : 1);
				}
			}
		});
		return this;
	};

	// Add default CSS
	var styles = document.createElement('style');
	var t = '.oi-viz-table';
	var th = '.oi-viz-table-holder';
	var mb = '.oi-menu-bar';
	var mi = 'li[role=menuitem]';
	styles.innerHTML = `
	.oi-viz-wrapper { --text: #222222; --bg: #efefef; --border: silver; --hover: rgba(249, 188, 38,0.4); --select: rgba(11, 87, 208, 0.2); --select-hover: rgba(11, 87, 208, 0.4); --select-border: rgba(11, 87, 208, 1); display: flex; flex-direction: column; width: 100%; }
	.oi-viz-wrapper button { font-size: 1em; }
	${mb} { background: var(--bg); padding: 0.25rem; border: 1px solid var(--border); text-align: left; display: flex; gap: 0.25em; }
	${mb} button { padding: 0.25em 0.5em; line-height: 0; line-height: 1.5rem; border-radius: 2px; background: #ddd; }
	${mb} button svg { width: 1em; height: 1em; vertical-align: -.125em; }
	${t} { border-collapse: separate; }
	${t} [scope=row] { text-align: right; }
	${t} td, ${t} th { border-right: 0; border-top: 0; border-color: var(--border); }
	${t} thead { position: sticky; top: 0; }
	${t} th, ${t} td { border-color: var(--border); }
	${t} tr:hover { background: var(--hover); }
	${t} th, ${t} td[scope=row] { cursor: pointer; background: var(--bg); color: var(--text); }
	${t} th > div { display: flex; align-items: center; position: relative; gap: 0.5rem; }
	${t} th .heading { display: inline-block; cursor: text; flex-grow: 1; white-space: nowrap; }
	${t} th .menu { width: 1em; height: 1em; border-radius: 100%; background: rgba(0,0,0,0.1); padding: 0; border: 0; display: flex; align-items: center; justify-content: center; }
	${t} th .menu:focus { outline: 2px solid var(--select-border); }
	${t} .selected { background: var(--select); }
	${t} .selected:hover { background: var(--select-hover); }
	${th} { overflow: auto; max-width: 100%; max-height: 80vh; position: relative; }
	${th} ul[role=menu] { position: relative; z-index: 1100; list-style: none; margin: 0; padding: 4px; list-style: none; display: flex; flex-wrap: wrap; box-sizing: border-box; gap: 4px; background: #efefef; border: 1px solid rgba(0,0,0,0.3); border-radius: 4px; position: absolute; top: 0; left: 0; flex-direction: column; min-width: 192px; box-shadow: 1px 1px 4px rgba(0,0,0,0.2); }
	${th} ${mi} { white-space: nowrap; display:block; cursor: pointer; background: transparent; }
	${th} ${mi} .button { cursor: pointer; width: 100%; border: 0; line-height: 1rem; margin-right: 1px; padding: 0.5em; text-align: left; display: flex; flex-direction: row; gap: 0.5rem; align-items: center; background: transparent; }
	${th} ${mi} .button:focus,${th} ${mi} .button:hover { background: #222!important; color: #fff!important; cursor: auto; }
	${th} ${mi} .button svg { height: 1rem; width: 1rem; }
	${th} ${mi} .button .key { flex-grow: 1; text-align: right; color: #80868b; font-weight: bold; }
	${th} ${mi} .button:disabled, ${th} ${mi} .button:disabled > * { opacity: 0.6; color: inherit!important; }
	${th} li.separator { line-height: 0; border: 0; border-top: 1px solid rgba(0,0,0,0.3); }
	`;
	document.head.prepend(styles);

	function getRow(el){ return parseInt((el.hasAttribute('data-row') ? el : el.closest('[data-row]')).getAttribute('data-row')); }
	function getCol(el){ var cel = (el.hasAttribute('data-col') ? el : el.closest('[data-col]'))||el; return parseInt(cel.getAttribute('data-col')); }
	function getPos(el){ return {'col':getCol(el),'row':getRow(el)}; }
	function clone(d){ return JSON.parse(JSON.stringify(d)); }
	function addButton(el,opt){
		if(!opt) opt = {};
		var btn = document.createElement('button');
		btn.innerHTML = opt.html||'Button';
		if(opt.label) btn.setAttribute('aria-label',opt.label);
		if(typeof opt.click) btn.addEventListener('click',opt.click);
		el.appendChild(btn);
		return btn;
	}

	// Set our default column-menu items
	if(!OI.CSVEditorMenuOptions) OI.CSVEditorMenuOptions = {};
	function addMenu(list){
		for(var id in list) OI.CSVEditorMenuOptions[id] = list[id];
	}
	addMenu({
		'select': {
			'type':'button','title':'Select column','icon': '<path d="M2,7v-2h5v-5h2v5h5v2h-5v5h-2v-5z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.select("col",c,false,false);
				this.setFocus(c);
			}
		},
		'deselect':{
			'type':'button','title':'Deselect column','icon': '<path d="M2,7v-2h12v2h-12z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.deselect("col",c,false,false);
				this.setFocus(c);
			}
		},
		'sortup':{
			'type':'button','title':'Sort table (increasing)','icon': '<path d="M3,2h1.5v9l1,-1 1,1 -2.75,3 -2.75,-3 1,-1 1,1 v-9zM7,2h3.5v1.5h-3.5zM7,5h5v1.5h-5zM7,8h6.5v1.5h-6.5zM7,11h8v1.5h-8z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.sortBy("col",c,false);
			}
		},
		'sortdown':{
			'type':'button','title':'Sort table (decreasing)','icon': '<path d="M3,2h1.5v9l1,-1 1,1 -2.75,3 -2.75,-3 1,-1 1,1 v-9zM7,2h8v1.5h-8zM7,5h6.5v1.5h-6.5zM7,8h5v1.5h-5zM7,11h3.5v1.5h-3.5z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.sortBy("col",c,true);
			}
		},
		'moveleft':{
			'type':'button','title':'Move column left','icon': '<path d="M2,8l3,-2.75 1,1 -1,1h9v1.5h-9l1,1 -1,1z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.shiftBy("col",c,-1);
			}
		},
		'moveright':{
			'type':'button','title':'Move column right','icon': '<path d="M2,7.25h9l-1,-1 1,-1 3,2.75 -3,2.75 -1,-1 1,-1h-9v-1.5z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.shiftBy("col",c,1);
			}
		},
		'stripnonnumeric':{
			'type':'button','title':'Strip non-numeric characters',
			'fn': function(el){
				var c = getCol(el);
				this.strip("col",c,/[^0-9\.\-\+]/g);
			}
		},
		'delete':{
			'type':'button','title':'Delete column','icon': '<path d="M1,2h5v-1h4v1h5v1.5h-1v11.5h-12v-11.5h1.5v10h9v-10h-11.5M5.5,5h1.5v7h-1.5v-7M9,5h1.5v7h-1.5v-7z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.delete("col",c);
				this.setFocus(c);
			}
		},
		'duplicate':{
			'type':'button','title':'Duplicate column','icon':'<path d="M5,1h10v10h-10v-8.5h1.5v7h7v-7h-8.5zM1,5h3v1.5h-1.5v7h7v-1.5h1.5v3h-10v-10z"/>',
			'fn': function(el){
				var c = getCol(el);
				this.duplicate("col",c);
			}
		},
		'separator':{
			'type':'separator'
		}
	});

	function Menu(holder,opts){
		if(!opts) opts = {};
		var ul = document.createElement('ul');
		ul.setAttribute('role','menu');
		ul.style.display = "none";
		if(opts.id) ul.id = opts.id;
		holder.appendChild(ul);
		this.get = function(){ return ul; };
		this.addItems = function(items,ctx){
			var i,a,item,id;
			if(typeof items==="string") items = items.split(/,/);
			for(i = 0; i < items.length; i++){
				item = items[i];
				if(typeof item==="string" && item in OI.CSVEditorMenuOptions){
					id = item;
					item = OI.CSVEditorMenuOptions[item];
					item.id = 'oi-menu-'+id;
				}
				item['this'] = ctx||this;
				a = new MenuItem(this,item);
			}
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
			if(bb.right > bbh.right) ul.style.transform = 'translate3d(-'+Math.ceil(bb.right-bbh.right+24)+'px,0,0)';
			return this;
		};
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

	function CSVToArray (CSV_string, delimiter) {
		CSV_string = CSV_string.replace(/[\n\r]+$/g,"");
		delimiter = (delimiter || ",");
		var pattern = new RegExp(("(\\" + delimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + delimiter + "\\r\\n]*))"), "gi");
		var rows = [[]];
		var matches = false;
		while(matches = pattern.exec( CSV_string )){
			var matched_delimiter = matches[1];
			if(matched_delimiter.length && matched_delimiter !== delimiter) rows.push([]);
			var matched_value;
			matched_value = (matches[2]) ? matches[2].replace(new RegExp( "\"\"", "g" ), "\"") : matches[3];
			rows[rows.length - 1].push(matched_value||"");
		}
		return rows;
	}
	root.OI = OI||root.OI||{};

})(window || this);