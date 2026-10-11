// Preserve the authored miniature, but submit its static surfaces and moving parts in batches.
export function batchWorld(THREE, mergeGeometries, world, debug = false) {
  const intro = { value: 0 };
  const inverse = new THREE.Matrix4();
  const identity = new THREE.Matrix4();
  const point = new THREE.Vector3();
  const particlePose = new THREE.Object3D();
  const dynamic = [];
  const materialCache = new Map();
  const diagnostics = [];

  // Debug only: compare actual transformed vertices, not rotated local AABBs.
  // The source snapshot is in root space so a later root transform is applied exactly once.
  function includeVertices(bounds, geometry, matrix, snapshot = null) {
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(matrix);
      bounds.expandByPoint(point);
      if (snapshot) snapshot.push(point.x, point.y, point.z);
    }
  }

  function styleKey(source, moving) {
    const material = source.material;
    // Animated emissive scenery shares the original material, so night controls still work.
    if (!moving && material.emissive && material.emissive.getHex() !== 0) return material.uuid;
    return [material.type, material.roughness, material.metalness, material.transparent,
      material.side, material.wireframe, material.depthWrite, material.blending,
      moving ? 'moving' : 'static'].join('/');
  }

  function batchMaterial(source, moving) {
    const key = styleKey(source, moving);
    if (materialCache.has(key)) return materialCache.get(key);
    const original = source.material;
    const emissiveScenery = !moving && original.emissive && original.emissive.getHex() !== 0;
    const material = emissiveScenery ? original : original.clone();
    if (!emissiveScenery) {
      material.color.setRGB(1, 1, 1);
      if (material.emissive) material.emissive.setRGB(0, 0, 0);
      material.opacity = 1;
    }
    material.vertexColors = !moving;
    // Flat translucent halos/ripples need one pass, rather than front/back transparency passes.
    if (material.transparent && material.side === THREE.DoubleSide) material.forceSinglePass = true;
    material.onBeforeCompile = shader => {
      if (moving) {
        shader.vertexShader = 'attribute vec3 instanceGlow;\nattribute float instanceAlpha;\nvarying vec3 vGlow;\nvarying float vAlpha;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nvGlow = instanceGlow;\nvAlpha = instanceAlpha;');
        shader.fragmentShader = 'varying vec3 vGlow;\nvarying float vAlpha;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.a *= vAlpha;');
        if (material.isMeshStandardMaterial) {
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow;');
        }
      } else {
        shader.uniforms.townIntro = intro;
        shader.vertexShader = 'attribute float districtIndex;\nuniform float townIntro;\n' + shader.vertexShader;
        // Scale in town coordinates after the instance transform: all six districts retain their stagger.
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vec4 mvPosition = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          if (districtIndex >= 0.0) {
            float t = clamp((townIntro - districtIndex * 0.14) / 1.15, 0.0, 1.0);
            float scaleY = t >= 1.0 ? 1.0 : max(0.001, 1.0 - exp(-7.0 * t) * cos(10.0 * t));
            mvPosition.y *= scaleY;
          }
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
        `);
      }
    };
    material.customProgramCacheKey = () => moving ? 'elsewhere-instance-glow-v1' : 'elsewhere-stagger-v1';
    materialCache.set(key, material);
    return material;
  }

  function geometryKey(geometry) {
    // Independently authored rings and repeated models can still share a single instance batch.
    // RoundedBoxGeometry inherits unit-box parameters; the authored size key is authoritative.
    return geometry.userData.batchKey || geometry.uuid;
  }

  function pack(root) {
    root.updateWorldMatrix(true, true);
    inverse.copy(root.matrixWorld).invert();
    const staticGroups = new Map();
    const movingGroups = new Map();
    const record = debug ? { root, source: new THREE.Box3(), vertices: [], meshes: [], checked: false } : null;
    function visit(node, moving = false, district = -1) {
      moving = moving || node.userData.actor === true || node.userData.dynamic === true;
      if (node.userData.district !== undefined) district = node.userData.district;
      if (node.userData.agent !== undefined || node.userData.building !== undefined) {
        node.material.visible = false;
        node.geometry.computeBoundingBox();
      } else if (node.isMesh && !node.isInstancedMesh && !node.userData.keepRender) {
        const key = styleKey(node, moving);
        const groups = moving ? movingGroups : staticGroups;
        const groupKey = moving ? key + '/' + geometryKey(node.geometry) : key + '/' + node.castShadow;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push({ source: node, district });
        if (record && !moving) {
          identity.multiplyMatrices(inverse, node.matrixWorld);
          includeVertices(record.source, node.geometry, identity, record.vertices);
        }
      } else if (node.isPoints) {
        node.layers.set(1);
      }
      for (let i = 0; i < node.children.length; i++) visit(node.children[i], moving, district);
    }
    visit(root);

    function instances(entries, moving) {
      const first = entries[0].source;
      const geometry = new THREE.BufferGeometry().copy(first.geometry);
      geometry.clearGroups();
      const colors = new Float32Array(entries.length * 3);
      const glow = new Float32Array(entries.length * 3);
      const alpha = new Float32Array(entries.length);
      if (!moving) {
        // Vertex colors stay white here; each original surface color goes into instanceColor.
        const white = new Float32Array(geometry.attributes.position.count * 3).fill(1);
        geometry.setAttribute('color', new THREE.BufferAttribute(white, 3));
        geometry.setAttribute('districtIndex', new THREE.InstancedBufferAttribute(
          Float32Array.from(entries, entry => entry.district), 1));
      } else {
        geometry.setAttribute('instanceGlow', new THREE.InstancedBufferAttribute(glow, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('instanceAlpha', new THREE.InstancedBufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
      }
      const mesh = new THREE.InstancedMesh(geometry, batchMaterial(first, moving), entries.length);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      mesh.castShadow = !moving && first.castShadow;
      mesh.receiveShadow = !moving;
      mesh.matrixAutoUpdate = false;
      if (moving) {
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
      }
      for (let i = 0; i < entries.length; i++) {
        const source = entries[i].source;
        identity.multiplyMatrices(inverse, source.matrixWorld);
        mesh.setMatrixAt(i, identity);
        const emitter = !moving && source.material.emissive && source.material.emissive.getHex() !== 0;
        if (emitter) colors.fill(1, i * 3, i * 3 + 3);
        else mesh.setColorAt(i, source.material.color);
        if (moving) source.layers.set(1);
        else source.removeFromParent();
      }
      if (!moving) { mesh.computeBoundingBox(); mesh.computeBoundingSphere(); }
      root.add(mesh);
      if (record && !moving) record.meshes.push(mesh);
      if (moving) dynamic.push({ mesh, entries, glow, alpha, colors, root });
    }

    for (const entries of staticGroups.values()) {
      const repeated = new Map(), unique = [];
      for (const entry of entries) {
        const key = geometryKey(entry.source.geometry);
        if (!repeated.has(key)) repeated.set(key, []);
        repeated.get(key).push(entry);
      }
      for (const group of repeated.values()) {
        if (group.length > 1) instances(group, false);
        else unique.push(group[0]);
      }
      if (!unique.length) continue;
      const geometries = [];
      const first = unique[0].source;
      const originalMaterial = first.material;
      const emitter = originalMaterial.emissive && originalMaterial.emissive.getHex() !== 0;
      for (const entry of unique) {
        const source = entry.source;
        // copy() into a plain BufferGeometry avoids re-running RoundedBoxGeometry's
        // constructor (clone() does), which logs a noisy three.js warning.
        let geometry = new THREE.BufferGeometry().copy(source.geometry);
        // Rounded boxes are non-indexed; normalize all unique pieces before merging.
        if (geometry.index) {
          const indexed = geometry;
          geometry = indexed.toNonIndexed();
          indexed.dispose();
        }
        identity.multiplyMatrices(inverse, source.matrixWorld);
        geometry.applyMatrix4(identity);
        geometry.clearGroups();
        const count = geometry.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const color = source.material.color;
        for (let i = 0; i < count; i++) {
          colors[i * 3] = emitter ? 1 : color.r;
          colors[i * 3 + 1] = emitter ? 1 : color.g;
          colors[i * 3 + 2] = emitter ? 1 : color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('districtIndex', new THREE.BufferAttribute(new Float32Array(count).fill(entry.district), 1));
        geometries.push(geometry);
        source.removeFromParent();
      }
      const merged = mergeGeometries(geometries, false);
      if (!merged) throw new Error('Incompatible scenery geometry');
      for (const geometry of geometries) geometry.dispose();
      const mesh = new THREE.Mesh(merged, batchMaterial(first, false));
      mesh.castShadow = first.castShadow; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
      merged.computeBoundingSphere(); root.add(mesh);
      if (record) record.meshes.push(mesh);
    }
    for (const entries of movingGroups.values()) instances(entries, true);
    if (record) { record.vertices = new Float64Array(record.vertices); diagnostics.push(record); }
  }

  pack(world.town);
  pack(world.home);
  // The authored particle emitters remain as pose/state records; only one instanced batch is drawn.
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(.038, 6, 4),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .95 }), 84);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(84 * 3), 3).setUsage(THREE.DynamicDrawUsage);
  sparks.frustumCulled = false; sparks.visible = false; world.town.add(sparks);

  function isVisible(source, root) {
    let node = source;
    while (node && node !== root) {
      if (!node.visible) return false;
      node = node.parent;
    }
    return root.visible;
  }

  function sync(root, sparkLimit) {
    // Batch instance matrices are local to the batch root, just like baked static vertices.
    inverse.copy(root.matrixWorld).invert();
    for (let b = 0; b < dynamic.length; b++) {
      const batch = dynamic[b];
      if (batch.root !== root) continue;
      let count = 0;
      for (let i = 0; i < batch.entries.length; i++) {
        const source = batch.entries[i].source;
        if (!isVisible(source, root)) continue;
        identity.multiplyMatrices(inverse, source.matrixWorld);
        batch.mesh.setMatrixAt(count, identity);
        const material = source.material, color = material.color, emissive = material.emissive;
        const offset = count * 3;
        batch.colors[offset] = color.r; batch.colors[offset + 1] = color.g; batch.colors[offset + 2] = color.b;
        const intensity = material.emissiveIntensity || 0;
        batch.glow[offset] = emissive ? emissive.r * intensity : 0;
        batch.glow[offset + 1] = emissive ? emissive.g * intensity : 0;
        batch.glow[offset + 2] = emissive ? emissive.b * intensity : 0;
        batch.alpha[count] = material.opacity;
        count++;
      }
      batch.mesh.count = count; batch.mesh.visible = count > 0;
      if (count) {
        batch.mesh.instanceMatrix.needsUpdate = true; batch.mesh.instanceColor.needsUpdate = true;
        batch.mesh.geometry.attributes.instanceGlow.needsUpdate = true;
        batch.mesh.geometry.attributes.instanceAlpha.needsUpdate = true;
      }
    }
    if (root !== world.town) return;
    let count = 0;
    for (let i = 0; i < world.robots.length; i++) {
      const emitter = world.robots[i].userData.sparks;
      if (!emitter.visible) continue;
      const positions = emitter.geometry.attributes.position;
      for (let j = 0; j < sparkLimit; j++) {
        point.fromBufferAttribute(positions, j).applyMatrix4(emitter.matrixWorld).applyMatrix4(inverse);
        particlePose.position.copy(point); particlePose.updateMatrix();
        sparks.setMatrixAt(count, particlePose.matrix); sparks.setColorAt(count, emitter.material.color); count++;
      }
    }
    sparks.count = count; sparks.visible = count > 0;
    if (count) { sparks.instanceMatrix.needsUpdate = true; sparks.instanceColor.needsUpdate = true; }
  }
  function checkBounds(root, repeat = false) {
    if (!debug) return null;
    const record = diagnostics.find(item => item.root === root);
    if (!record || (record.checked && !repeat)) return null;
    record.checked = true;
    root.updateWorldMatrix(true, true);
    const source = new THREE.Box3(), batched = new THREE.Box3();
    const instance = new THREE.Matrix4(), transform = new THREE.Matrix4();
    for (let i = 0; i < record.vertices.length; i += 3) {
      point.fromArray(record.vertices, i).applyMatrix4(root.matrixWorld);
      source.expandByPoint(point);
    }
    for (const mesh of record.meshes) {
      if (mesh.isInstancedMesh) {
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, instance);
          transform.multiplyMatrices(mesh.matrixWorld, instance);
          includeVertices(batched, mesh.geometry, transform);
        }
      } else {
        includeVertices(batched, mesh.geometry, mesh.matrixWorld);
      }
    }
    const error = Math.max(source.min.distanceTo(batched.min), source.max.distanceTo(batched.max));
    const name = root === world.town ? 'Agent Town' : 'Smart Home';
    console.info('Elsewhere scenery bounds / '+name, { unbatched: source, batched, worldSpaceError: error });
    if (error > .001) {
      console.warn('Elsewhere batching bounds mismatch / '+name, { unbatched: source, batched, error });
    }
    return { source, batched, error };
  }
  return { intro, sync, checkBounds };
}
