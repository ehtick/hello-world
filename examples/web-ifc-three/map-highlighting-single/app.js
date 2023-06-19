import {
  Matrix4,
  Vector3,
  AmbientLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  MeshLambertMaterial,
  Group,
} from "three";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { RaycastMap } from "./RaycastMap";

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap Contributors",
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
      },
    ],
  },
  zoom: 14,
  center: [13.4453, 52.491],
  pitch: 75,
  bearing: -80,
  hash: true,
  maxZoom: 24,
  maxPitch: 75,
  antialias: true,
});

const modelOrigin = [13.4453, 52.491];
const modelAltitude = 0;

const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
  modelOrigin,
  modelAltitude
);

const camera = new PerspectiveCamera();

const cameraTransform = new Matrix4()
  .makeTranslation(
    modelAsMercatorCoordinate.x,
    modelAsMercatorCoordinate.y,
    modelAsMercatorCoordinate.z
  )
  .scale(new Vector3(1, -1, 1));

const renderer = new WebGLRenderer({
  canvas: map.getCanvas(),
  antialias: true,
});
renderer.autoClear = false;

const scene = new Scene();
const ifcLoader = new IFCLoader();
const ifcModelsGroup = new Group();
scene.add(ifcModelsGroup);

const customLayer = {
  id: "3d-model",
  type: "custom",
  renderingMode: "3d",

  onAdd: function () {
    ifcLoader.ifcManager.setWasmPath("../../../");
    ifcLoader.load("../../../IFC/01.ifc", function (model) {
      ifcModelsGroup.add(model);
      map.flyTo({
        zoom: 18.4
      });
    });

    ifcModelsGroup.rotateX(Math.PI / 2);
    ifcModelsGroup.rotateY(Math.PI / 4);
    ifcModelsGroup.scale.setScalar(
      modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
    );

    const ambientLight = new AmbientLight(0xffffff);

    scene.add(ambientLight);
  },
  render: function (gl, matrix) {
    camera.projectionMatrix = new Matrix4()

      .fromArray(matrix)
      .multiply(cameraTransform);
    renderer.resetState();
    renderer.render(scene, camera);
    map.triggerRepaint();
  },
};

map.on("style.load", () => {
  map.addLayer(customLayer);

  raycastHighlightStart();
});

function raycastHighlightStart() {
  ifcLoader.ifcManager.setupThreeMeshBVH(
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast
  );
  const raycaster = new RaycastMap(map, camera);

  let preselect = { modelID: -1, subsetID: -1 };

  const preselectMat = new MeshLambertMaterial({
    transparent: true,
    opacity: 0.6,
    color: 0xff88ff,
    depthTest: false,
  });

  map.on("mousemove", ({ point }) => {
    const intersects = raycaster.intersectObjectsFromPoint(
      point,
      ifcModelsGroup.children
    );

    const found = intersects[0];
    const ifc = ifcLoader.ifcManager;
    if (found) {
      const index = found.faceIndex;
      const geometry = found.object.geometry;
      const id = ifc.getExpressId(geometry, index);

      if (
        preselect.modelID === found.object.modelID &&
        preselect.subsetID === id
      ) {
        return;
      }
      preselect.modelID = found.object.modelID;
      preselect.subsetID = id;
      ifcLoader.ifcManager.createSubset({
        modelID: preselect.modelID,
        ids: [id],
        material: preselectMat,
        scene: ifcModelsGroup,
        removePrevious: true,
      });

      ifc.getItemProperties(preselect.modelID, id).then((props) => {
        // props contains the properties of the selected element
        console.log(props?.Name?.value);
      });
    } else {
      ifc.removeSubset(preselect.modelID, preselectMat);
      preselect = { modelID: -1 };
    }
  });
}
