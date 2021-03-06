
function $Handles($container, element, options){
	const outset = options.outset || 0;
	const get_offset_left = options.get_offset_left || (() => 0);
	const get_offset_top = options.get_offset_top || (() => 0);
	const size_only = options.size_only || false;
	let el = element;
	$container.on("new-element", (e, element) => {
		el = element;
	});
	
	const $resize_ghost = $(E("div")).addClass("resize-ghost");
	const handles = $.map([
		["top", "right"], // ↗
		["top", "middle"], // ↑
		["top", "left"], // ↖
		["middle", "left"], // ←
		["bottom", "left"], // ↙
		["bottom", "middle"], // ↓
		["bottom", "right"], // ↘
		["middle", "right"], // →
	], pos => {
		const y_axis = pos[0];
		const x_axis = pos[1];
		
		const $h = $(E("div")).addClass("handle");
		$h.appendTo($container);
		
		$h.attr("touch-action", "none");
		
		let delta_x = 0, delta_y = 0, width, height;
		let dragged = false;
		const resizes_height = y_axis !== "middle";
		const resizes_width = x_axis !== "middle";
		if(size_only && (y_axis === "top" || x_axis === "left")){
			$h.addClass("useless-handle");
		}else{
			
			let cursor_fname;
			if((x_axis === "left" && y_axis === "top") || (x_axis === "right" && y_axis === "bottom")){
				cursor_fname = "nwse-resize";
			}else if((x_axis === "right" && y_axis === "top") || (x_axis === "left" && y_axis === "bottom")){
				cursor_fname = "nesw-resize";
			}else if(resizes_width){
				cursor_fname = "ew-resize";
			}else if(resizes_height){
				cursor_fname = "ns-resize";
			}
			
			let fallback_cursor = "";
			if(y_axis === "top"){ fallback_cursor += "n"; }
			if(y_axis === "bottom"){ fallback_cursor += "s"; }
			if(x_axis === "left"){ fallback_cursor += "w"; }
			if(x_axis === "right"){ fallback_cursor += "e"; }
			
			fallback_cursor += "-resize";
			const cursor = make_css_cursor(cursor_fname, [16, 16], fallback_cursor);
			$h.css({cursor});
			
			const drag = e => {
				$resize_ghost.appendTo($container);
				dragged = true;
				
				const rect = el.getBoundingClientRect();
				const mx = e.clientX / magnification;
				const my = e.clientY / magnification;
				// TODO: decide between Math.floor/Math.ceil/Math.round for these values
				if(x_axis === "right"){
					delta_x = 0;
					width = ~~(mx - rect.left);
				}else if(x_axis === "left"){
					delta_x = ~~(mx - rect.left);
					width = ~~(rect.right - mx);
				}else{
					width = ~~(rect.width);
				}
				if(y_axis === "bottom"){
					delta_y = 0;
					height = ~~(my - rect.top);
				}else if(y_axis === "top"){
					delta_y = ~~(my - rect.top);
					height = ~~(rect.bottom - my);
				}else{
					height = ~~(rect.height);
				}
				$resize_ghost.css({
					position: "absolute",
					left: magnification * delta_x + get_offset_left(),
					top: magnification * delta_y + get_offset_top(),
					width: magnification * width,
					height: magnification * height,
				});
			};
			$h.on("pointerdown", e => {
				dragged = false;
				if(e.button === 0){
					$G.on("pointermove", drag);
					$("body").css({cursor}).addClass("cursor-bully");
				}
				$G.one("pointerup", e => {
					$G.off("pointermove", drag);
					$("body").css({cursor: ""}).removeClass("cursor-bully");
					
					$resize_ghost.remove();
					if(dragged){
						$(el).trigger("user-resized", [delta_x, delta_y, width, height]);
					}
					$container.trigger("update");
				});
			});
			$h.on("mousedown selectstart", e => {
				e.preventDefault();
			});
		}
		
		const update_handle = () => {
			const rect = el.getBoundingClientRect();
			const hs = $h.width();
			if(x_axis === "middle"){
				$h.css({ left: get_offset_left() + (rect.width - hs) / 2 });
			}else if(x_axis === "left"){
				$h.css({ left: get_offset_left() - outset });
			}else if(x_axis === "right"){
				$h.css({ left: get_offset_left() + (rect.width - hs/2) });
			}
			if(y_axis === "middle"){
				$h.css({ top: get_offset_top() + (rect.height - hs) / 2 });
			}else if(y_axis === "top"){
				$h.css({ top: get_offset_top() - outset });
			}else if(y_axis === "bottom"){
				$h.css({ top: get_offset_top() + (rect.height - hs/2) });
			}
		};
		
		$container.on("update resize scroll", update_handle);
		$G.on("resize theme-load", update_handle);
		setTimeout(update_handle, 50);
		
		return $h[0];
	});
	return $(handles);
}
