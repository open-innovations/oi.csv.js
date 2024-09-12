/**
	Open Innovations CSV Editor v0.1 - initial loader

	This creates a list of DOM elements with "data-oi-csv" attributes
	and, if one is clicked, it loads the rest of the editor.
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
	root.OI = OI||root.OI||{};
	
	var s = document.getElementsByTagName("script");
	var path = s[s.length-1].src.replace(/([^\/]*)$/,'');

	// The source of the mai script that we will only load when we need it
	var editor = path+"oi.csv.editor.js";

	// Create a list of DOM elements that have the 'data-oi-csv' attribute
	function List(){
		this.version = "0.1";
		var _obj = this;
		this.list = [];
		this.get = function(){
			var i,j,m,els;
			els = document.querySelectorAll('[data-oi-csv]');
			for(i=0; i<els.length; i++){
				m = -1;
				for(j=0; j < this.list.length; j++){
					if(this.list[j].el==els[i]){ m = j; continue; }
				}
				if(m<0) this.list.push(new ListItem(els[j],{'list':this,'item':this.list.length}));
			}
		};
		var loaded = false;
		var loading = false;
		var todo = [];
		// Process a particular list item
		this.load = function(i){
			if(this.list[i].editor){
				this.list[i].editor.open();
				return this;
			}
			todo.push(i);
			if(loaded){
				// Already loaded the main script
				this.process();
			}else{
				if(!loading){
					console.info('Loading script from %c'+editor+'%c','font-style:italic;color:#2254F4;','');
					// We haven't started loading the main script
					loading = true;
					var script = document.createElement('script');
					script.type = 'text/javascript';
					script.src = editor;
					script.onload = function(){ loaded = true; _obj.process(); }
					document.head.appendChild(script);
				}
			}
			return this;
		};
		// Process all outstanding list items
		this.process = function(){
			for(var i=todo.length-1; i>=0; i--){
				this.list[todo[i]]._init();
				todo.splice(todo[i]);
			}
			return this;
		};
		return this;
	}

	// Create a simple list item
	function ListItem(el,props){
		if(!props) props = {};
		this.el = el;
		var _obj = this;
		var _processed = false;
		this._init = function(){
			if(!_processed){
				if(typeof OI.CSVEditor!=="function"){
					console.error('Not loaded the CSV Editor. :(');
					return this;
				}
				_processed = true;
				this.editor = new OI.CSVEditor(this.el);
				this.editor.open();
			}
		};
		el.addEventListener('click',function(e){
			e.preventDefault();
			if(_processed) _obj.editor.open();
			else props.list.load(props.item);
		})
		return this;
	}

	OI.CSVs = new List();
	OI.ready(function(){ OI.CSVs.get(); });

})(window || this);