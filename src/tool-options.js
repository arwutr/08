
const brush_canvas = make_canvas();
const brush_ctx = brush_canvas.ctx;
let brush_shape = "circle";
let brush_size = 4;
let eraser_size = 8;
let airbrush_size = 9;
const pencil_size = 1;
let stroke_size = 1; // lines, curves, shape outlines
let tool_transparent_mode = false;

const ChooserCanvas = (
	url,
	invert,
	width,
	height,
	sourceX,
	sourceY,
	sourceWidth,
	sourceHeight,
	destX,
	destY,
	destWidth,
	destHeight
) => {
	const c = make_canvas(width, height);
	let img = ChooserCanvas.cache[url];
	if(!img){
		img = ChooserCanvas.cache[url] = E("img");
		img.src = url;
	}
	const render = () => {
		c.ctx.drawImage(
			img,
			sourceX, sourceY, sourceWidth, sourceHeight,
			destX, destY, destWidth, destHeight
		);
		if(invert){
			const id = c.ctx.getImageData(0, 0, c.width, c.height);
			for(let i=0; i<id.data.length; i+=4){
				id.data[i+0] = 255 - id.data[i+0];
				id.data[i+1] = 255 - id.data[i+1];
				id.data[i+2] = 255 - id.data[i+2];
			}
			c.ctx.putImageData(id, 0, 0);
		}
	};
	$(img).on("load", render);
	render();
	return c;
};
ChooserCanvas.cache = {};

const $Choose = (things, display, choose, is_chosen) => {
	const $chooser = $(E("div")).addClass("chooser");
	$chooser.on("update", () => {
		$chooser.empty();
		for(let i=0; i<things.length; i++){
			(thing => {
				const $option_container = $(E("div")).appendTo($chooser);
				let $option = $();
				const choose_thing = () => {
					if(is_chosen(thing)){
						return; // unnecessary optimization
					}
					choose(thing);
					$G.trigger("option-changed");
				};
				const update = () => {
					const selected_color = get_theme() === "modern.css" ? "#0178d7" : "#000080"; // TODO: get from a CSS variable
					$option_container.css({
						backgroundColor: is_chosen(thing) ? selected_color : ""
					});
					$option_container.empty();
					$option = $(display(thing, is_chosen(thing)));
					$option.appendTo($option_container);
				};
				update();
				$chooser.on("redraw", update);
				$G.on("option-changed", update);
				
				$option_container.on("pointerdown click", choose_thing);
				$chooser.on("pointerdown", () => {
					$option_container.on("pointerenter", choose_thing);
				});
				$G.on("pointerup", () => {
					$option_container.off("pointerenter", choose_thing);
				});
				
			})(things[i]);
		}
	});
	return $chooser;
};
const $ChooseShapeStyle = () => {
	const $chooser = $Choose(
		[
			{stroke: true, fill: false},
			{stroke: true, fill: true},
			{stroke: false, fill: true}
		],
		({stroke, fill}, is_chosen) => {
			const sscanvas = make_canvas(39, 21);
			const ssctx = sscanvas.ctx;
			
			// border px inwards amount
			let b = 5;
			ssctx.fillStyle = is_chosen ? "#fff" : "#000";
			
			if(stroke){
				// just using a solid rectangle for the stroke
				// so as not to have to deal with the pixel grid with strokes
				ssctx.fillRect(b, b, sscanvas.width-b*2, sscanvas.height-b*2);
			}
			
			// go inward a pixel for the fill
			b += 1;
			ssctx.fillStyle = "#777";
			
			if(fill){
				ssctx.fillRect(b, b, sscanvas.width-b*2, sscanvas.height-b*2);
			}else{
				ssctx.clearRect(b, b, sscanvas.width-b*2, sscanvas.height-b*2);
			}
			
			return sscanvas;
		},
		({stroke, fill}) => {
			$chooser.stroke = stroke;
			$chooser.fill = fill;
		},
		({stroke, fill}) => $chooser.stroke === stroke && $chooser.fill === fill
	).addClass("choose-shape-style");
	
	$chooser.fill = false;
	$chooser.stroke = true;
	
	return $chooser;
};

const $choose_brush = $Choose(
	(() => {
		const brush_shapes = ["circle", "square", "reverse_diagonal", "diagonal"];
		const circular_brush_sizes = [7, 4, 1];
		const brush_sizes = [8, 5, 2];
		const things = [];
		brush_shapes.forEach((brush_shape)=> {
			const sizes = brush_shape === "circle" ? circular_brush_sizes : brush_sizes;
			sizes.forEach((brush_size)=> {
				things.push({
					shape: brush_shape,
					size: brush_size,
				});
			});
		});
		return things;
	})(),
	(o, is_chosen) => {
		const cbcanvas = make_canvas(10, 10);
		
		const shape = o.shape;
		const size = o.size;
		
		cbcanvas.ctx.fillStyle =
		cbcanvas.ctx.strokeStyle =
			is_chosen ? "#fff" : "#000";
		
		render_brush(cbcanvas.ctx, shape, size);
		
		return cbcanvas;
	}, ({shape, size}) => {
		brush_shape = shape;
		brush_size = size;
	}, ({shape, size}) => brush_shape === shape && brush_size === size
).addClass("choose-brush");

const $choose_eraser_size = $Choose(
	[4, 6, 8, 10],
	(size, is_chosen) => {
		const cecanvas = make_canvas(39, 16);
		
		cecanvas.ctx.fillStyle = is_chosen ? "#fff" : "#000";
		render_brush(cecanvas.ctx, "square", size);
		
		return cecanvas;
	},
	size => {
		eraser_size = size;
	},
	size => eraser_size === size
).addClass("choose-eraser");

const $choose_stroke_size = $Choose(
	[1, 2, 3, 4, 5],
	(size, is_chosen) => {
		const w = 39, h = 12, b = 5;
		const cscanvas = make_canvas(w, h);
		const center_y = (h - size) / 2;
		cscanvas.ctx.fillStyle = is_chosen ? "#fff" : "#000";
		cscanvas.ctx.fillRect(b, ~~center_y, w - b*2, size);
		return cscanvas;
	},
	size => {
		stroke_size = size;
	},
	size => stroke_size === size
).addClass("choose-stroke-size");

const magnifications = [1, 2, 6, 8, 10];
const $choose_magnification = $Choose(
	magnifications,
	(scale, is_chosen) => {
		const i = magnifications.indexOf(scale);
		const secret = scale === 10; // 10x is secret
		const chooser_canvas = ChooserCanvas(
			"images/options-magnification.png",
			is_chosen, // invert if chosen
			39, (secret ? 2 : 13), // width, height of destination canvas
			i*23, 0, 23, 9, // x, y, width, height from source image
			8, 2, 23, 9 // x, y, width, height on destination
		);
		if(secret){
			$(chooser_canvas).addClass("secret-option");
		}
		return chooser_canvas;
	},
	scale => {
		set_magnification(scale);
	},
	scale => scale === magnification
).addClass("choose-magnification")
.css({position: "relative"}); // positioning context for above `position: "absolute"` canvas

$choose_magnification.on("update", () => {
	$choose_magnification
		.find(".secret-option")
		.parent()
		.css({position: "absolute", bottom: "-2px", left: 0, opacity: 0});
});

const airbrush_sizes = [9, 16, 24];
const $choose_airbrush_size = $Choose(
	airbrush_sizes,
	(size, is_chosen) => {
		
		const image_width = 72; // width of source image
		const i = airbrush_sizes.indexOf(size); // 0 or 1 or 2
		const l = airbrush_sizes.length; // 3
		const is_bottom = (i === 2);
		
		const shrink = 4 * !is_bottom;
		const w = image_width / l - shrink * 2;
		const h = 23;
		const source_x = image_width / l * i + shrink;
		
		return ChooserCanvas(
			"images/options-airbrush-size.png",
			is_chosen, // invert if chosen
			w, h, // width, height of created destination canvas
			source_x, 0, w, h, // x, y, width, height from source image
			0, 0, w, h // x, y, width, height on created destination canvas
		);
	},
	size => {
		airbrush_size = size;
	},
	size => size === airbrush_size
).addClass("choose-airbrush-size");

const $choose_transparent_mode = $Choose(
	[false, true],
	(_tool_transparent_mode, is_chosen) => {
		const sw = 35, sh = 23; // width, height from source image
		const b = 2; // margin by which the source image is inset on the destination
		const theme_folder = `images/${get_theme().replace(/\.css/, "")}`;
		return ChooserCanvas(
			`${theme_folder}/options-transparency.png`,
			false, // never invert it
			b+sw+b, b+sh+b, // width, height of created destination canvas
			0, _tool_transparent_mode ? 22 : 0, sw, sh, // x, y, width, height from source image
			b, b, sw, sh // x, y, width, height on created destination canvas
		);
	},
	_tool_transparent_mode => {
		tool_transparent_mode = _tool_transparent_mode;
	},
	_tool_transparent_mode => _tool_transparent_mode === tool_transparent_mode
).addClass("choose-transparent-mode");

