/**
 * The sunbeam that comes in over the top-right of the home page frame and
 * lands on the masthead.
 *
 * It's a single fragment shader over the viewport, drawn as an ordinary
 * translucent overlay: a gentle cool shade over the page with the shaft cut
 * out of it, plus a little warmth inside the shaft. The paper never gets
 * brighter than paper; everything around the beam gets dimmer, which is both
 * how sunlight indoors actually reads and the only way it can read here --
 * adding light to near-white cream does nothing, and the first attempt at
 * this, with `screen`, was invisible.
 *
 * Plain alpha rather than a blend mode: `mix-blend-mode` on a fixed element
 * comes unstuck from the viewport when the page scrolls in Chromium, leaving
 * a hard seam across the page at the old scroll offset.
 *
 * What sells it as light rather than a gradient is the combination of a
 * soft-edged shaft that widens as it travels, streaks running its length from
 * an uneven aperture, a slow drift of haze, dust caught in it, and a brighter
 * pool where it lands. The landing point is measured from the masthead rather
 * than hardcoded, so the beam keeps finding the name at any width.
 *
 * Light mode only; CSS hides the element in dark, and this stops drawing.
 */

const VERTEX = `
attribute vec2 aPosition;
void main() {
	gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uResolution;  // device pixels
uniform float uScale;      // device pixels per CSS pixel
uniform float uTime;
uniform vec2 uSource;      // where the beam enters, in px, y down
uniform vec2 uDir;         // unit vector along the beam, y down
uniform vec2 uTarget;      // the middle of the name
uniform float uReach;      // distance from source to target
uniform float uHalfWidth;  // half the shaft's width at the target
uniform float uShade;
uniform float uSpan;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * noise(p);
		p *= 2.03;
		a *= 0.5;
	}
	return v;
}

void main() {
	// gl_FragCoord is in device pixels; everything else here is measured from
	// the layout, in CSS pixels. Convert once, up front.
	vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uScale;
	vec2 rel = p - uSource;
	vec2 perp = vec2(-uDir.y, uDir.x);
	float along = dot(rel, uDir);
	float across = dot(rel, perp);
	float x = along / uReach;

	float lit = 0.0;
	float motes = 0.0;

	if (along > 0.0) {
		// The shaft widens as it travels, so the cross-section is measured in
		// units of the local half-width.
		// Sunlight is near enough to parallel that the shaft only flares a
		// little over this distance. The edges wander slightly, the way they
		// do when whatever the light came past isn't perfectly straight.
		float width = uHalfWidth * (0.76 + 0.26 * x)
			* (0.93 + 0.14 * fbm(vec2(x * 1.8, 7.0)));
		float u = across / max(width, 1.0);
		// A flat top with soft shoulders, rather than a bell: a shaft has
		// edges, and a Gaussian never quite gets there.
		float core = exp(-pow(abs(u), 2.8) * 1.7);

		// Full strength where it enters, thinning out well past the name.
		float fade = smoothstep(0.0, 0.07, x) * (1.0 - 0.5 * smoothstep(0.2, 1.7, x));

		// Streaks: an uneven aperture, so the variation runs across the shaft
		// and holds along its length. This is most of what reads as sunlight,
		// which means it needs enough frequency across to be several streaks
		// rather than one soft gradient.
		float streak = 0.34 + 0.82 * pow(fbm(vec2(u * 7.0, x * 0.55 + uTime * 0.012)), 1.4);
		// Haze drifting through it, coarser and slower.
		float haze = 0.82 + 0.18 * fbm(vec2(u * 0.7 + 5.0, x * 1.1 - uTime * 0.05));

		// Enough gain that the brightest streaks reach unshaded paper, but not
		// so much that everything clips there and the structure disappears.
		float shaft = core * fade * streak * haze * 1.18;

		// The pool where it lands, elongated along the beam.
		vec2 rt = p - uTarget;
		vec2 pool = vec2(dot(rt, uDir) / (uHalfWidth * 1.7), dot(rt, perp) / (uHalfWidth * 0.95));
		float landing = exp(-dot(pool, pool) * 1.3) * 0.7;

		// Dust caught in the light, drifting across it.
		vec2 dp = p * 0.05 + vec2(uTime * 0.05, -uTime * 0.017);
		vec2 cell = floor(dp);
		vec2 frac = fract(dp);
		float seed = hash(cell);
		if (seed > 0.94) {
			vec2 at = vec2(hash(cell + 1.7), hash(cell + 3.3));
			motes = smoothstep(0.15, 0.0, length(frac - at))
				* (0.45 + 0.55 * sin(uTime * 1.1 + seed * 60.0))
				* core * fade;
		}

		lit = clamp(shaft + landing * core * fade, 0.0, 1.0);
	}

	// Ambient shade, deepening with distance from where the light comes in.
	// Cool, but only a little: the paper is warm cream and too much blue in
	// the shade turns the whole page gray.
	float away = clamp(length(p - uSource) / uSpan, 0.0, 1.0);
	float shadeAlpha = uShade * (0.72 + 0.28 * away);
	vec3 shadeColor = vec3(0.22, 0.26, 0.38);

	// Inside the shaft, a wash of warmth instead. Kept light, so the lit
	// paper stays close to paper and reads as the bright part of the page.
	vec3 warmColor = vec3(1.0, 0.93, 0.76);

	float alpha = mix(shadeAlpha, 0.1, lit);
	vec3 color = mix(shadeColor, warmColor, lit);

	// Motes read as specks of paper with nothing over them at all.
	alpha *= 1.0 - motes * 0.85;

	gl_FragColor = vec4(color * alpha, alpha);
}`;

interface Running {
	stop(): void;
}

function prefersLight(): boolean {
	const chosen = document.documentElement.dataset.theme;
	if (chosen === 'light') return true;
	if (chosen === 'dark') return false;
	return window.matchMedia('(prefers-color-scheme: light)').matches;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function start(root: HTMLElement): Running | null {
	const canvas = root.querySelector('canvas');
	if (!(canvas instanceof HTMLCanvasElement)) return null;

	const gl = canvas.getContext('webgl', {
		alpha: true,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: 'low-power',
	});
	if (!gl) return null;

	const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
	const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
	const program = vertex && fragment ? gl.createProgram() : null;
	if (!vertex || !fragment || !program) return null;

	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
	gl.useProgram(program);

	// One triangle large enough to cover the clip volume.
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	const position = gl.getAttribLocation(program, 'aPosition');
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

	const uniform = (name: string) => gl.getUniformLocation(program, name);
	const uResolution = uniform('uResolution');
	const uScale = uniform('uScale');
	const uTime = uniform('uTime');
	const uSource = uniform('uSource');
	const uDir = uniform('uDir');
	const uTarget = uniform('uTarget');
	const uReach = uniform('uReach');
	const uHalfWidth = uniform('uHalfWidth');
	const uShade = uniform('uShade');
	const uSpan = uniform('uSpan');

	let width = 0;
	let height = 0;

	function layout() {
		width = Math.max(1, Math.round(window.innerWidth));
		height = Math.max(1, Math.round(window.innerHeight));
		const scale = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(width * scale);
		canvas.height = Math.round(height * scale);
		gl.viewport(0, 0, canvas.width, canvas.height);

		// Aim at the name, slightly left of its center so the light falls
		// across it rather than stopping in the middle of it. The canvas is
		// fixed to the viewport, so the target is measured as though the page
		// were scrolled to the top: the light stays where it is in the room
		// while the page moves past it.
		const name = document.querySelector('.deco-masthead');
		let target = { x: width * 0.2, y: height * 0.28 };
		let halfWidth = height * 0.14;
		if (name) {
			const box = name.getBoundingClientRect();
			target = {
				x: box.left + box.width * 0.42,
				y: box.top + window.scrollY + box.height * 0.5,
			};
			halfWidth = Math.min(Math.max(box.height * 0.7, 70), 190);
		}

		// The beam comes over the top-right corner and rakes across to the
		// name, so the direction falls out of those two points rather than
		// being fixed: the name sits high on the page, and any angle steep
		// enough to look like a shaft would have entered somewhere else
		// entirely.
		const entry = { x: width * 0.94, y: -height * 0.14 };
		const run = { x: target.x - entry.x, y: target.y - entry.y };
		const reach = Math.max(1, Math.hypot(run.x, run.y));
		const dir = { x: run.x / reach, y: run.y / reach };

		gl.uniform2f(uResolution, canvas.width, canvas.height);
		gl.uniform1f(uScale, scale);
		gl.uniform2f(uSource, entry.x, entry.y);
		gl.uniform2f(uDir, dir.x, dir.y);
		gl.uniform2f(uTarget, target.x, target.y);
		gl.uniform1f(uReach, reach);
		gl.uniform1f(uHalfWidth, halfWidth);
		gl.uniform1f(uShade, 0.16);
		gl.uniform1f(uSpan, Math.hypot(width, height) * 1.15);
	}

	const still = window.matchMedia('(prefers-reduced-motion: reduce)');
	let frame = 0;
	const visible = true;
	const started = performance.now();

	function draw(now: number) {
		gl.uniform1f(uTime, (now - started) / 1000);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	function tick(now: number) {
		draw(now);
		frame = requestAnimationFrame(tick);
	}

	function play() {
		cancelAnimationFrame(frame);
		if (still.matches || document.hidden || !visible) {
			draw(performance.now());
			return;
		}
		frame = requestAnimationFrame(tick);
	}

	layout();
	root.classList.add('is-live');
	play();

	const resizeObserver = new ResizeObserver(() => {
		layout();
		if (still.matches || document.hidden || !visible) draw(performance.now());
	});
	resizeObserver.observe(document.documentElement);

	const onVisibility = () => play();
	document.addEventListener('visibilitychange', onVisibility);
	still.addEventListener('change', play);

	return {
		stop() {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			document.removeEventListener('visibilitychange', onVisibility);
			still.removeEventListener('change', play);
			root.classList.remove('is-live');
			// Free the GPU memory, then swap in a fresh canvas. A lost context
			// stays lost -- getContext hands the same dead one back -- so
			// without this, toggling to dark and back leaves the beam gone.
			gl.getExtension('WEBGL_lose_context')?.loseContext();
			canvas.replaceWith(document.createElement('canvas'));
		},
	};
}

let running: Running | null = null;

function sync() {
	const root = document.querySelector('.deco-sunbeam');
	const wanted = root instanceof HTMLElement && prefersLight();
	if (wanted && !running) {
		// If WebGL isn't available the element keeps its CSS beam, which is
		// the same shape without the volume.
		running = start(root as HTMLElement);
	} else if (!wanted && running) {
		running.stop();
		running = null;
	}
}

function teardown() {
	running?.stop();
	running = null;
}

sync();
document.addEventListener('astro:page-load', sync);
document.addEventListener('astro:before-swap', teardown);
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', sync);

// The toggle writes data-theme onto <html>; pick that up without polling.
new MutationObserver(sync).observe(document.documentElement, {
	attributes: true,
	attributeFilter: ['data-theme'],
});
