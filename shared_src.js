// Vertex shader program

const vsSource =
	`#version 300 es
	precision mediump float;
	in vec2 aVertexPosition;

	uniform vec3 look_dir;
	uniform vec3 look_up;
	uniform vec3 look_right;

	out vec3 ray_dir_v;

	void main(void) {
		gl_Position = vec4(aVertexPosition, 1, 1);
		ray_dir_v = aVertexPosition.x * look_right + aVertexPosition.y * look_up + look_dir;
	}
	`;

// Fragment shader program

const fsSource =
	`#version 300 es
	#define RESOLUTION 10
	#define GRIDSIZE 1024.0
	#define GRIDSIZE_I 1024
	#define ITER 30
	
	precision mediump float;
	in vec3 ray_dir_v;
	
	uniform vec3 cam_eye;
	
	uniform highp usampler2D memory_sampler;
	
	const vec3 bg = vec3(1,1,1);
	
	out vec4 outColor;
	
	vec3 ray_pos;
	vec3 ray_dir;
	float block_level;
	
	ivec2 blocktexel;
	
	float max3 (vec3 v) {
		return max (max (v.x, v.y), v.z);
	}
	
	float min3 (vec3 v) {
		return min (min (v.x, v.y), v.z);
	}
	
	bool lookupPos() {
		
		if(any(lessThan(ray_pos, vec3(0))) || any(lessThanEqual(vec3(GRIDSIZE), ray_pos))) {
			return true;
		}
		blocktexel = ivec2(0,1);
		ivec3 pixel = ivec3(ray_pos);
	
		int block_level_id = RESOLUTION-1;
		for(; block_level_id >= 0;block_level_id--) {
			int val = 8*((pixel.x >> block_level_id) & 1) + 4*((pixel.y >> block_level_id) & 1) + 2*((pixel.z >> block_level_id) & 1);
			blocktexel = ivec2(texelFetch(memory_sampler, blocktexel + ivec2(val, 0), 0).x, texelFetch(memory_sampler, blocktexel + ivec2(val + 1, 0), 0).x);
			if(blocktexel.y ==  0) break;
		}
		block_level = pow(2.0, float(block_level_id));
		return false;
	}
	
	void main(void) {
		outColor = vec4(1,0,0,0);
		ray_dir = normalize(ray_dir_v);
		ray_pos = cam_eye;
	
		float collision = 0.1 + max(max3(mix(-ray_pos / ray_dir, (vec3(GRIDSIZE) - ray_pos) / ray_dir, lessThan(ray_dir, vec3(0)))), 0.0);
		ray_pos += collision * ray_dir;
	
	
		for(int iter = 0; iter < ITER; ++iter) {
			if(lookupPos()) {
				outColor = vec4(mix(bg, outColor.rgb, outColor.a), 1.0);
				return;
			}
			vec4 newColor = vec4(float(blocktexel.x & 48) / 48.0, float(blocktexel.x & 12) / 12.0, float(blocktexel.x & 3) / 3.0, float(blocktexel.x & 192) / 192.0);
			outColor = vec4(mix(newColor.rgb, outColor.rgb, outColor.a), 1.0-(1.0-outColor.a)*(1.0-newColor.a));
			if(outColor.a > 0.99) {
				return;
			}
			collision = 0.1 + block_level * min3(mix((vec3(1) - fract(ray_pos/block_level)) / ray_dir, -fract(ray_pos/block_level) / ray_dir, lessThan(ray_dir, vec3(0))));
			ray_pos += collision * ray_dir;
		}
	
		outColor = vec4(mix(vec3(1), outColor.rgb, outColor.a), 1);
	}
	`;