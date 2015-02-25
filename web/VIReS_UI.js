var UI;

window.onload = function() {

	document.getElementById("file").onchange = readFile;
	UI = new Plot3D(document.getElementById("graphArea"));
	
	UI.setColor(0xd3d3d3);
	UI.drawCube(200);

	UI.setColor(0xffffff);
	UI.plotOrigin();

	UI.render();
};

function readFile() {
	var file = this.files[0];
	var reader = new FileReader();

	reader.onload = function(e) {
		UI.massPlotting(this.result);
		
	};
	reader.readAsText(file);
}