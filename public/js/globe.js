(function(document, window) {

  var Globe = window.Globe = function(options) {

    var self = this;
    this.options = options;

    if ( !Detector.webgl ) {

      Detector.addGetWebGLMessage();
      return;

    }

    this.scene = null;
    this.radius = 6371;
    this.meshPlanet = null,
    this.geometryPlanet = null;

    var tilt = 0,//0.41,
        rotationSpeed = 0.1,
        cloudsScale = 1.005,
        container,
        stats,
        camera, controls, renderer, meshClouds,
        dirLight, ambientLight,
        clock = new THREE.Clock();

    this.groupGeometry = new THREE.CubeGeometry( 100, 100, 1 );
    this.groupMaterial = new THREE.MeshLambertMaterial( {
      color: 0xCC0000,
      opacity: 0.7
    });

    this.points = [];
    this.arcs = [];
    this.group = new THREE.Object3D();

    init();
    animate();

    function init() {

      container = document.getElementById(self.options.container);

      var height = container.offsetHeight,
          width  = container.offsetWidth;

      self.scene = new THREE.Scene();

      renderer = new THREE.WebGLRenderer( { clearAlpha: 1, clearColor: 0x000000, antialias: true } );
      renderer.setSize( width, height );
      renderer.sortObjects = false;
      renderer.autoClear = false;

      //

      renderer.gammaInput = true;
      renderer.gammaOutput = true;

      //

      container.appendChild( renderer.domElement );

      camera = new THREE.PerspectiveCamera( 25, width / height, 50, 1e7 );
      camera.position.z = self.radius * 7;
      self.scene.add( camera );

      controls = new THREE.TrackballControls( camera, renderer.domElement );

      controls.rotateSpeed = 1.0;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.2;

      controls.noZoom = false;
      controls.noPan = false;

      controls.staticMoving = false;
      controls.dynamicDampingFactor = 0.3;

      controls.minDistance = self.radius * 1.1;
      controls.maxDistance = self.radius * 100;

      controls.keys = [ 65, 83, 68 ]; // [ rotateKey = 'a', zoomKey = 's', panKey = 'd']

      dirLight = new THREE.DirectionalLight( 0xFFFFFF );
      dirLight.position.set( -1, 0, 1 ).normalize();
      self.scene.add( dirLight );


      var planetTexture = THREE.ImageUtils.loadTexture( "img/earth_atmos_2048.jpg" ),
      cloudsTexture     = THREE.ImageUtils.loadTexture( "img/earth_clouds_1024.png" ),
      normalTexture     = THREE.ImageUtils.loadTexture( "img/earth_normal_2048.jpg" ),
      specularTexture   = THREE.ImageUtils.loadTexture( "img/earth_specular_2048.jpg" );

      var shader = THREE.ShaderUtils.lib[ "normal" ],
      uniforms = THREE.UniformsUtils.clone( shader.uniforms );

      uniforms[ "tNormal" ].texture = normalTexture;
      uniforms[ "uNormalScale" ].value = 0.85;

      uniforms[ "tDiffuse" ].texture = planetTexture;
      uniforms[ "tSpecular" ].texture = specularTexture;

      uniforms[ "enableAO" ].value = false;
      uniforms[ "enableDiffuse" ].value = true;
      uniforms[ "enableSpecular" ].value = true;

      uniforms[ "uDiffuseColor" ].value.setHex( 0xffffff );
      uniforms[ "uSpecularColor" ].value.setHex( 0x666666 );
      uniforms[ "uAmbientColor" ].value.setHex( 0x000000 );

      uniforms[ "uShininess" ].value = 20;

      uniforms[ "uDiffuseColor" ].value.convertGammaToLinear();
      uniforms[ "uSpecularColor" ].value.convertGammaToLinear();
      uniforms[ "uAmbientColor" ].value.convertGammaToLinear();

      var materialNormalMap = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: uniforms,
        lights: true
      });


      // planet

      self.geometryPlanet = new THREE.SphereGeometry( self.radius, 100, 50 );
      self.geometryPlanet.computeTangents();

      self.meshPlanet = new THREE.Mesh( self.geometryPlanet, materialNormalMap );
      self.meshPlanet.rotation.y = 0;
      self.meshPlanet.rotation.z = tilt;
      self.scene.add( self.meshPlanet );

      // points
      self.scene.add( self.group );

      // clouds

      var materialClouds = new THREE.MeshLambertMaterial( { color: 0xffffff, map: cloudsTexture, transparent:true } );

      meshClouds = new THREE.Mesh( self.geometryPlanet, materialClouds );
      meshClouds.scale.set( cloudsScale, cloudsScale, cloudsScale );
      meshClouds.rotation.z = tilt;
      self.scene.add( meshClouds );

      // stars

      var i,
      vector,
      starsGeometry = new THREE.Geometry();

      for ( i = 0; i < 1500; i ++ ) {

        vector = new THREE.Vector3( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
        vector.multiplyScalar( self.radius );

        starsGeometry.vertices.push( new THREE.Vertex( vector ) );

      }

      var stars,
      starsMaterials = [
        new THREE.ParticleBasicMaterial( { color: 0x555555, size: 2, sizeAttenuation: false } ),
        new THREE.ParticleBasicMaterial( { color: 0x555555, size: 1, sizeAttenuation: false } ),
        new THREE.ParticleBasicMaterial( { color: 0x333333, size: 2, sizeAttenuation: false } ),
        new THREE.ParticleBasicMaterial( { color: 0x3a3a3a, size: 1, sizeAttenuation: false } ),
        new THREE.ParticleBasicMaterial( { color: 0x1a1a1a, size: 2, sizeAttenuation: false } ),
        new THREE.ParticleBasicMaterial( { color: 0x1a1a1a, size: 1, sizeAttenuation: false } )
      ];

      for ( i = 10; i < 30; i ++ ) {

        stars = new THREE.ParticleSystem( starsGeometry, starsMaterials[ i % 6 ] );

        stars.rotation.x = Math.random() * 6;
        stars.rotation.y = Math.random() * 6;
        stars.rotation.z = Math.random() * 6;

        var s = i * 10;
        stars.scale.set( s, s, s );

        stars.matrixAutoUpdate = false;
        stars.updateMatrix();

        self.scene.add( stars );

      }

      //window.addEventListener( 'resize', onWindowResize, false );
    }


    function animate() {

      requestAnimationFrame( animate );

      render();
      //stats.update();
    }

    function render() {

      var delta = clock.getDelta();

      self.meshPlanet.rotation.y += rotationSpeed * delta;
      meshClouds.rotation.y += 1.25 * rotationSpeed * delta;

      self.group.rotation.y += rotationSpeed * delta;

      controls.update();

      renderer.clear();
      renderer.render( self.scene, camera );

    }

    this.getCoordinates = function(longitude, latitude, altitude) {
      var phi = (90 - latitude) * Math.PI / 180;
      var theta = Math.PI + (180 - longitude) * Math.PI / 180;

      altitude = (null == altitude) ? 0 : altitude;

      return {
        x: (this.radius + altitude) * Math.sin(phi) * Math.cos(theta),
        y: (this.radius + altitude) * Math.cos(phi),
        z: (this.radius + altitude) * Math.sin(phi) * Math.sin(theta)
      };
    };
  };

  Globe.prototype.addPoint = function(longitude, latitude) {

    var mesh = new THREE.Mesh( this.groupGeometry, this.groupMaterial );

    mesh.position = this.getCoordinates(longitude, latitude);
    mesh.lookAt(this.meshPlanet.position);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    this.points.push(mesh);
    this.group.add(mesh);

    // optionnaly trim the points array
    if (undefined != this.options.points_limit && this.points.length >= this.options.points_limit) {
      this.group.remove(this.points.shift());
    }

    return [longitude, latitude];

  };

  Globe.prototype.addGreatArc = function(source, target) {

    var sourcePosition = this.getCoordinates(source[0], source[1]);
    var targetPosition = this.getCoordinates(target[0], target[1]);

    var origin = new THREE.Vector3(sourcePosition.x, sourcePosition.y, sourcePosition.z);
    var destination = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
    var distance = origin.distanceTo(destination);

    // intermediate position
    var v1 = origin.clone().setLength(this.radius + distance);
    var v2 = destination.clone().setLength(this.radius + distance);
    var middle = new THREE.Vector3().add(v1, v2).divideScalar(2);


    //var curve = new THREE.CubicBezierCurve3(origin, v1, v2, destination);
    //var curve = new THREE.SplineCurve3([origin, v1, v2, destination]);
    var curve = new THREE.QuadraticBezierCurve3(origin, middle, destination);


    var geometry = new THREE.Geometry();

    curve.getSpacedPoints(50).forEach(function(point) {
      geometry.vertices.push(new THREE.Vertex(point));
    })

    var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xffaa00, opacity: 0.6 , linewidth: 3} ));

    this.arcs.push(line);
    this.group.add(line);

    // optionnaly trim the arcs array
    if (undefined != this.options.arcs_limit && this.arcs.length >= this.options.arcs_limit) {
      this.group.remove(this.arcs.shift());
    }


  };

})(document, window);

