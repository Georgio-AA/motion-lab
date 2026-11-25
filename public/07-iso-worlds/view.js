// The moving camera must retain r170's world-matrix updates, even with a frozen scene traversal.
export function createViewCamera(THREE) {
  const camera = new THREE.OrthographicCamera(-15, 15, 15, -15, .1, 160);
  camera.matrixWorldAutoUpdate = true;
  return camera;
}

// Shared by the live view and the static regression comparison; no temporary objects.
export function placeViewCamera(camera, target, offset, zoom) {
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
