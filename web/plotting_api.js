// dom = container (drawing area)
function Plot3D(dom) {
	this.CONTAINER_ = dom;
	this.controls;
	dom.height = 650;
	dom.width = 850;
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(75, 
				dom.width / dom.height,
		 		0.1, 1000);
	var tempObj = { color: 0x0000ff, dashSize: 3, gapSize: 1, lineWidth: 2};
	this.material = new THREE.LineBasicMaterial(tempObj);
	this.renderer = new THREE.WebGLRenderer();
	this.renderer.precision = "lowp";

	console.log(dom.height);
	this.renderer.setSize(dom.width, dom.height);
	this.CONTAINER_.appendChild(this.renderer.domElement);

	
};

// from = a 3d vector indicating the starting point.
Plot3D.prototype.drawLine = function(from, to) {
	geometry = new THREE.Geometry();
	geometry.vertices.push(
			new THREE.Vector3(from[0], from[1], from[2]),
 			new THREE.Vector3(to[0], to[1], to[2])
 	);
 	return new THREE.Line(geometry, this.material, THREE.LineStrip);
};

// Return the generated cuboid of type Object3D
Plot3D.prototype.drawCuboid = function(w, h, d) {
	var group = new THREE.Object3D();
	var points = [  [[0,0,0], [w,0,0]],
				    [[0,0,0], [0,h,0]],
				    [[0,0,0], [0,0,d]],
				    [[w,0,0], [w,0,d]],
				    [[w,0,0], [w,h,0]],
				    [[0,h,0], [0,h,d]],
				    [[0,h,0], [w,h,0]],
				    [[0,0,d], [w,0,d]],
				    [[0,0,d], [0,h,d]],
				    [[w,h,0], [w,h,d]],
				    [[0,h,d], [w,h,d]],
				    [[w,0,d], [w,h,d]] ];

	points.forEach(function (ele, index) {
		group.add(this.drawLine(ele[0], ele[1]));
	}, this);
	this.camera.position.set(d / 2, d / 2, d * 3);
	this.camera.updateMatrix();

	this.controls = new THREE.OrbitControls(this.camera);
	this.controls.addEventListener("change", renderNow.bind(this));

	function renderNow () {
		this.renderer.render( this.scene, this.camera );
	}
	group.position.set( - w/2, -h/2, -d/2);
	return group;
};

Plot3D.prototype.drawCube = function(s) {
	this.scene.add(this.drawCuboid(s,s,s));
};

Plot3D.prototype.plotPoint = function(x, y, z) {
	var geometry = new THREE.SphereGeometry(1, 1, 1);
	var sphere = new THREE.Mesh(geometry, this.material);
	sphere.position.set(x, y, z);
	this.scene.add(sphere);
};

Plot3D.prototype.plotOrigin = function() {
	var geometry = new THREE.SphereGeometry(3, 32, 32);
	var sphere = new THREE.Mesh(geometry, this.material);
	sphere.position.set(0, 0, 0);
	this.scene.add(sphere);
};

Plot3D.prototype.render = function() {
	requestAnimationFrame(this.render.bind(this));
	//cube.rotation.x += 0.1;
	//cube.rotation.y += 0.1;
	this.renderer.render( this.scene, this.camera );
};

Plot3D.prototype.setColor = function(c) {
	this.material = new THREE.MeshBasicMaterial({color: c});
};

var colors = [0xff0000,0x0000ff, 0xffffff];
var counter = 0;

// Assumes data be a well-formed 3 value per line file.
// Ignores the first line.
Plot3D.prototype.massPlotting = function(data) {
	var lines = data.split('\n');
	counter = (counter + 1) % 3;
	var particles = new THREE.Geometry();
	for (var i = 1; i < lines.length - 1; i++) {
		var position = lines[i].split(' ');
		var x = parseFloat(position[0]);
		var y = parseFloat(position[1]);
		var z = parseFloat(position[2]);
		console.log(particles.vertices.push);
		particles.vertices.push(new THREE.Vector3(x, y, z));
	}

	var particle_mat = new THREE.ParticleBasicMaterial({
		color: colors[counter],
		size: 1
	});

	var particleSystem = new THREE.ParticleSystem(
		particles,
		particle_mat
	);

	this.scene.add(particleSystem);
}