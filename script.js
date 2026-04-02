import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 7;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const count = 25000; 
const posVapor = new Float32Array(count * 3);
const posLogo = new Float32Array(count * 3);
const randoms = new Float32Array(count);

function bowlWidth(t) {
	const curved = Math.pow(t, 0.6);
	return 1.6 * curved;
}

const BOWL_BOTTOM = -0.8;
const BOWL_TOP    =  1.8;
const rimHalfWidth = bowlWidth(1.0);

for(let i = 0; i < count; i++) {
	posVapor[i*3]   = (Math.random() - 0.5) * 15;
	posVapor[i*3+1] = (Math.random() - 0.5) * 15;
	posVapor[i*3+2] = (Math.random() - 0.5) * 5;

	randoms[i] = Math.random();

	let x, y, z = (Math.random() - 0.5) * 0.1;
	const r = Math.random();

	if (r < 0.60) {
		const t    = Math.random();
		const bowlY = BOWL_BOTTOM + t * (BOWL_TOP - BOWL_BOTTOM);
		const hw    = bowlWidth(t);
		if (Math.random() < 0.70) {
			const side  = Math.random() > 0.5 ? 1 : -1;
			const edgeNoise = Math.random() * 0.06;
			x = (hw - edgeNoise) * side;
		} else {
			x = (Math.random() * 2 - 1) * hw;
		}
		y = bowlY;
	} else if (r < 0.67) {
		const side = Math.random() > 0.5 ? 1 : -1;
		x = (Math.random() * rimHalfWidth) * side;
		y = BOWL_TOP + (Math.random() - 0.5) * 0.07;
	} else if (r < 0.82) {
		x = (Math.random() - 0.5) * 0.09;
		y = Math.random() * 1.7 - 2.5;
	} else if (r < 0.88) {
		x = (Math.random() - 0.5) * 2.8;
		y = -2.5 + (Math.random() - 0.5) * 0.10;
	} else {
		const EAR_HALF_BASE = 0.42;
		const EAR_HEIGHT    = 0.85;
		const EAR_CENTRE_X  = rimHalfWidth * 0.48;
		const side = Math.random() > 0.5 ? 1.0 : -1.0;
		const centreX = EAR_CENTRE_X * side;
		let u = Math.random(), v = Math.random();
		if (u + v > 1.0) { u = 1.0 - u; v = 1.0 - v; }
		const heightFrac = u;
		const spreadFrac = v;
		const sliceHalfWidth = EAR_HALF_BASE * (1.0 - heightFrac);
		x = centreX + (spreadFrac * 2.0 - 1.0) * sliceHalfWidth * side;
		y = BOWL_TOP + heightFrac * EAR_HEIGHT;
		if (Math.random() < 0.35) {
			const edgeSide = Math.random() > 0.5 ? 1 : -1;
			x = centreX + edgeSide * sliceHalfWidth * side;
		}
	}

	posLogo[i*3]   = x;
	posLogo[i*3+1] = y;
	posLogo[i*3+2] = z;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(posVapor, 3));
geometry.setAttribute('targetPosition', new THREE.BufferAttribute(posLogo, 3));
geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

const vertexShader = `
	uniform float uTime;
	uniform float uMorph;
	uniform vec2 uMouse;
	attribute vec3 targetPosition;
	attribute float aRandom;
	varying float vGlow;
	varying float vRandom;
	varying float vMouseDist;
	void main() {
		vRandom = aRandom;
		vec3 pos = position;
		float drift = uTime * 0.3;
		pos.y += mod(drift + pos.x * 0.5, 12.0) - 6.0;
		pos.x += sin(uTime + pos.y) * 0.4;
		vec3 finalPos = mix(pos, targetPosition, uMorph);
		
		float dist = distance(finalPos.xy, uMouse * 6.0);
		vMouseDist = smoothstep(2.5, 0.0, dist);

		vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
		gl_PointSize = (22.0 / -mvPosition.z) * (0.7 + sin(uTime * 1.5 + float(gl_VertexID)) * 0.3);
		gl_PointSize += vMouseDist * 5.0;
		
		gl_Position = projectionMatrix * mvPosition;
		vGlow = gl_PointSize;
	}
`;

const fragmentShader = `
	varying float vGlow;
	varying float vRandom;
	varying float vMouseDist;
	void main() {
		float d = distance(gl_PointCoord, vec2(0.5));
		if(d > 0.5) discard;
		vec3 pink = vec3(1.0, 0.0, 0.5); 
		vec3 cyan = vec3(0.0, 1.0, 1.0);
		
		float mixVal = clamp(vRandom + (vMouseDist * 0.5), 0.0, 1.0);
		vec3 color = mix(pink, cyan, mixVal);
		
		float alpha = 0.8 * (0.5 - d);
		alpha += vMouseDist * 0.2;
		
		gl_FragColor = vec4(color, alpha);
	}
`;

const material = new THREE.ShaderMaterial({
	uniforms: {
		uTime: { value: 0 },
		uMorph: { value: 0 },
		uMouse: { value: new THREE.Vector2(10, 10) }
	},
	vertexShader,
	fragmentShader,
	transparent: true,
	blending: THREE.AdditiveBlending,
	depthWrite: false
});

const points = new THREE.Points(geometry, material);
scene.add(points);

function handleInteraction(x, y) {
	material.uniforms.uMouse.value.x = (x / window.innerWidth) * 2 - 1;
	material.uniforms.uMouse.value.y = -(y / window.innerHeight) * 2 + 1;
}

window.addEventListener('mousemove', (e) => handleInteraction(e.clientX, e.clientY));
window.addEventListener('touchmove', (e) => {
	if (e.touches.length > 0) handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

function animate(time) {
	const t = time * 0.001;
	material.uniforms.uTime.value = t;
	const morphCycle = Math.sin(t * (Math.PI * 2 / 15)) * 0.5 + 0.5;
	const m = Math.pow(morphCycle, 3.0);
	material.uniforms.uMorph.value = m;
	points.rotation.y = (1.0 - m) * Math.sin(t * 0.1) * 0.5;
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);