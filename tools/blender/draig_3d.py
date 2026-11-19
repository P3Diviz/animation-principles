# Draig in 3D for 11 Appeal: builds the three body types in Blender and exports them as
#   assets/models/draig-round.glb    chubby
#   assets/models/draig-square.glb   muscular
#   assets/models/draig-pointed.glb  skinny and bedraggled
#
# Run from the repo root (Blender 5.x; nothing else needed):
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python tools/blender/draig_3d.py
#
# How it works: each part is built from overlapping spheres (and tubes), then Blender's voxel
# remesh fuses them into one smooth sculpted surface, which is smoothed and reduced. Belly plates,
# abs and ribs are carved into the surface and painted as vertex colours. Face parts are placed on
# the head by casting rays at it. The page (js/pages/11-appeal-3d.js) gives every part its material
# by material name, and poses the named nodes:
#   Dragon > Legs, Tail, Body > Head > EyeL, EyeR;  Body > ArmL, ArmR, WingL, WingR
# Each node's origin is its pivot (hip, neck, shoulder, wing root, tail root, eye centre).
# Blender axes: x = his left (the viewer's right), -y = front, z = up. The glTF export turns
# this into three.js axes (front = +z, up = +y).
import bpy, bmesh, math, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

OUT = os.path.join(os.getcwd(), 'assets', 'models')
V = Vector

def lin(hexstr):
    """An sRGB hex colour as linear RGBA (vertex colours are stored linear)."""
    c = [int(hexstr[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((x + .055) / 1.055) ** 2.4 if x > .04045 else x / 12.92 for x in c) + (1.0,)

RED, BELLY, GROOVE, RIB = lin('#E0283F'), lin('#FBE0B4'), lin('#D9A56A'), lin('#A8182F')
SNOUT, BLUSH = lin('#F2566A'), lin('#FF7F90')

# ----- The three body types (metres) -----
TYPES = {
  'round': dict(   # chubby
    body=[((0, 0, .33), (.3, .27, .3)), ((0, -.05, .29), (.27, .25, .25)), ((0, 0, .55), (.2, .18, .14))],
    belly=dict(z0=.1, z1=.6, w=.2, pattern='plates', lines=[.2, .29, .38, .47]),
    hip=.25, neck=None, head_at=(0, 0, .62),
    head=[((0, 0, .88), (.31, .28, .27))], snout=((0, -.21, .8), (.16, .13, .105)),
    cheeks=((.17, -.12, .79), (.1, .09, .08)), fins=.07,
    eye=dict(x=.12, z=.9, r=(.1, .11, .06), lid=0), brow=dict(dz=.135, tilt=0, w=.06, r=.011),
    mouth='smile', horn=dict(x=.12, len=1, r=.042, droop=False), crest=[.05, .06, .045],
    arm=dict(sh=(.26, -.04, .5), el=(.31, -.1, .38), ha=(.3, -.16, .31), r=(.066, .056), hand=.07),
    leg=dict(hip=(.15, 0, .2), thigh=(.13, .13, .13), knee=None, ankle=None, r=0, foot=((.17, -.08, .055), (.11, .15, .06))),
    tail=dict(pts=[(0, .2, .2), (.1, .4, .11), (.28, .5, .1), (.42, .46, .2), (.42, .36, .32)], r=(.09, .03), spikes=.04, spade=.75, droop=False),
    wing=dict(root=(.13, .2, .6), scale=.75, sweep=.45, tatty=False),
    hunch=0),
  'square': dict(  # muscular
    body=[((0, 0, .58), (.34, .24, .2)), ((0, 0, .4), (.25, .2, .17)), ((0, 0, .27), (.26, .21, .12)),
          ((.12, -.14, .58), (.14, .1, .11)), ((-.12, -.14, .58), (.14, .1, .11)), ((0, .03, .7), (.24, .16, .08)),
          ((0, 0, .75), (.15, .14, .1))],
    belly=dict(z0=.22, z1=.7, w=.19, pattern='abs', lines=[.33, .42, .51]),
    hip=.3, neck=None, head_at=(0, 0, .76),
    head=[((0, 0, 1.0), (.28, .26, .25)), ((0, -.1, .9), (.22, .17, .11)), ((0, -.15, 1.06), (.21, .1, .055))],
    snout=((0, -.22, .93), (.17, .14, .11)), cheeks=None, fins=.08,
    eye=dict(x=.11, z=1.0, r=(.085, .09, .05), lid=.28), brow=dict(dz=.11, tilt=.38, w=.075, r=.016),
    mouth='grin', horn=dict(x=.13, len=1.35, r=.05, droop=False), crest=[.06, .075, .06],
    arm=dict(sh=(.36, 0, .62), el=(.43, -.02, .45), ha=(.43, -.1, .3), r=(.085, .072), hand=.085, delt=.12, bicep=(.41, -.05, .53, .092)),
    leg=dict(hip=(.16, 0, .25), thigh=(.13, .13, .14), knee=None, ankle=(.17, -.03, .1), r=.09, foot=((.18, -.09, .06), (.12, .17, .065))),
    tail=dict(pts=[(0, .18, .3), (.14, .38, .18), (.36, .52, .14), (.54, .5, .26), (.58, .38, .42)], r=(.1, .03), spikes=.06, spade=1, droop=False),
    wing=dict(root=(.14, .18, .66), scale=1.2, sweep=.55, tatty=False),
    hunch=0),
  'pointed': dict( # skinny and bedraggled
    body=[((0, 0, .45), (.15, .13, .22)), ((0, -.01, .56), (.16, .13, .11)), ((0, 0, .32), (.14, .12, .08))],
    belly=dict(z0=.26, z1=.62, w=.1, pattern='ribs', lines=[.34, .42, .5]),
    hip=.32, neck=[(0, -.01, .64), (0, -.04, .72), (0, -.06, .79)], head_at=(0, -.05, .76),
    head=[((0, -.06, .96), (.23, .24, .22))], snout=((0, -.29, .9), (.11, .15, .085)), cheeks=None, fins=.05,
    eye=dict(x=.095, z=.97, r=(.085, .09, .05), lid=.42), brow=dict(dz=.115, tilt=-.42, w=.055, r=.011),
    mouth='frown', horn=dict(x=.11, len=1.05, r=.03, droop=True), crest=[.05, .03, .045],
    arm=dict(sh=(.17, -.02, .58), el=(.21, -.03, .42), ha=(.21, -.1, .28), r=(.034, .03), hand=.045, elbow=.046),
    leg=dict(hip=(.09, 0, .3), thigh=None, knee=(.1, -.03, .17), ankle=(.1, -.02, .07), r=.04, foot=((.1, -.08, .045), (.075, .13, .045))),
    tail=dict(pts=[(0, .12, .3), (.08, .28, .12), (.2, .45, .04), (.42, .55, .035), (.6, .52, .04)], r=(.045, .013), spikes=.03, spade=.55, droop=True),
    wing=dict(root=(.08, .13, .6), scale=1.0, sweep=.3, tatty=True),
    hunch=9),
}

# ----- Building blocks: everything goes into a bmesh first -----
def place(c, r=(1, 1, 1), rot=None):
    return Matrix.Translation(V(c)) @ (rot or Matrix()) @ Matrix.Diagonal((r[0], r[1], r[2], 1))

def tag(geom, mi):
    for f in {f for v in geom['verts'] for f in v.link_faces}: f.material_index = mi

def ellipsoid(bm, c, r, mi=0, segs=40, rot=None):
    tag(bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2, radius=1, matrix=place(c, r, rot)), mi)

def aim(d):
    """A rotation that turns +z to point along d."""
    return V(d).normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()

def cone(bm, base, d, length, radius, mi=0, segs=16):
    d = V(d).normalized()
    m = Matrix.Translation(V(base) + d * length / 2) @ aim(d)
    tag(bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=radius, radius2=0, depth=length, matrix=m), mi)

def catmull(pts, n):
    """n points evenly along a smooth curve through pts."""
    pts = [V(p) for p in pts]; out = []
    for k in range(n):
        t = k / (n - 1) * (len(pts) - 1); i = min(int(t), len(pts) - 2); u = t - i
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        out.append(.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u ** 3))
    return out

def chain(bm, pts, r0, r1, mi=0, step=.45):
    """Overlapping spheres along a curve, thinning from r0 to r1 (fused smooth by the remesh)."""
    length = sum((V(b) - V(a)).length for a, b in zip(pts, pts[1:]))
    n = max(3, int(length / (min(r0, r1) * step)) + 1)
    for k, p in enumerate(catmull(pts, n)):
        r = r0 + (r1 - r0) * k / (n - 1)
        ellipsoid(bm, p, (r, r, r), mi, 20)

def tube(bm, pts, r0, r1, mi=0, rings=24, sides=14):
    """A tube along a curve that thins from r0 to r1, with a closed base (horns, brows, the mouth)."""
    path = catmull(pts, rings); loops = []
    for i, p in enumerate(path):
        t = (path[min(i + 1, rings - 1)] - path[max(i - 1, 0)]).normalized()
        a = t.orthogonal().normalized(); b = t.cross(a)
        r = r0 + (r1 - r0) * i / (rings - 1)
        loops.append([bm.verts.new(p + r * (math.cos(j / sides * 2 * math.pi) * a + math.sin(j / sides * 2 * math.pi) * b)) for j in range(sides)])
    for l0, l1 in zip(loops, loops[1:]):
        for j in range(sides):
            bm.faces.new((l0[j], l0[(j + 1) % sides], l1[(j + 1) % sides], l1[j])).material_index = mi
    for loop, flip in ((loops[0], True), (loops[-1], False)):
        f = bm.faces.new(loop[::-1] if flip else loop); f.material_index = mi
    bm.normal_update()

def to_object(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(bpy.data.materials.get(m) or bpy.data.materials.new(m))
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o

def apply(o, kind, **settings):
    """Apply one modifier, without bpy.ops (works in the background)."""
    m = o.modifiers.new('m', kind)
    for k, v in settings.items(): setattr(m, k, v)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear(); old = o.data; o.data = me; bpy.data.meshes.remove(old)

def sculpt(o, voxel, smooth=24):
    """Fuse the overlapping shapes into one smooth surface. The remesh works on a grid of tiny
    cubes; enough smoothing passes take out the faint grid it leaves in the shading."""
    mats = [m.name for m in o.data.materials]
    apply(o, 'REMESH', mode='VOXEL', voxel_size=voxel)
    apply(o, 'SMOOTH', factor=.5, iterations=smooth)
    o.data.materials.clear()
    for m in mats: o.data.materials.append(bpy.data.materials[m])

def reduce(o, faces):
    n = len(o.data.polygons)
    if n > faces: apply(o, 'DECIMATE', ratio=faces / n)

def smooth_shade(o):
    for p in o.data.polygons: p.use_smooth = True

def edit(o):
    bm = bmesh.new(); bm.from_mesh(o.data); return bm

def done(o, bm):
    bm.to_mesh(o.data); bm.free(); o.data.update()

def paint(o, colour):
    """Vertex colours: colour(position, normal) -> linear RGBA for every vertex."""
    attr = o.data.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT')
    for v in o.data.vertices: attr.data[v.index].color = colour(v.co, v.normal)
    o.data.color_attributes.active_color = attr

def mix(a, b, t):
    t = max(0, min(1, t)); return tuple(x + (y - x) * t for x, y in zip(a, b))

def smoothstep(x, a, b):
    t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)

def bump(x, w):
    return math.exp(-(x / w) ** 2)

def set_origin(o, pivot):
    o.data.transform(Matrix.Translation(-V(pivot))); o.location = V(pivot); PIVOT[o.name] = V(pivot)

PIVOT = {}   # each object's pivot in world space (set by set_origin)

def parent(child, par):
    """Parent without moving: parents are never turned or scaled, so the child's local position is
    the difference of the two world pivots."""
    child.parent = par
    child.location = PIVOT.get(child.name, V()) - PIVOT.get(par.name, V())

def empty(name, at=(0, 0, 0)):
    e = bpy.data.objects.new(name, None); e.location = V(at); bpy.context.collection.objects.link(e); return e

# ----- One dragon -----
def build(T):
    s3 = (-1, 1)

    # Body: torso (and neck), sculpted, with the belly carved and painted
    bm = bmesh.new()
    for c, r in T['body']: ellipsoid(bm, c, r)
    if T['neck']: chain(bm, T['neck'], .06, .055)
    body = to_object('Body', bm, ['skin'])
    sculpt(body, .007)
    B = T['belly']
    def belly_mask(co, n):
        across = 1 - smoothstep(abs(co.x), B['w'] * .6, B['w'] * 1.3)    # a soft edge either side
        front = smoothstep(-n.y, .1, .55)
        tall = smoothstep(co.z, B['z0'], B['z0'] + .05) * (1 - smoothstep(co.z, B['z1'] - .06, B['z1']))
        return across * front * tall
    def grooves(co, n):
        g = max([bump(co.z - z, .008) for z in B['lines']] + [0])
        if B['pattern'] == 'abs':          # a line down the middle of the six-pack, and under the pecs
            g = max(g, bump(co.x, .007) * (1 if co.z < .56 else 0), bump(co.z - .6, .01))
        return g * belly_mask(co, n)
    def ribs(co, n):
        if B['pattern'] != 'ribs' or not (.45 < co.z < .62): return 0
        return bump(((co.z * 20) % 1) - .5, .14) * smoothstep(abs(n.x), .45, .8) * smoothstep(-n.y, -.4, .2)
    bm = edit(body)
    for v in bm.verts:                      # carve the grooves into the surface
        d = grooves(v.co, v.normal) * .006 + ribs(v.co, v.normal) * .004
        v.co -= v.normal * d
    done(body, bm)
    reduce(body, 9000)
    paint(body, lambda co, n: mix(mix(mix(RED, BELLY, belly_mask(co, n)), GROOVE, grooves(co, n) * .85), RIB, ribs(co, n) * .9))

    # Legs: thighs, shins, feet, toes with claws (one object, both legs)
    L = T['leg']; bm = bmesh.new()
    for s in s3:
        hip = V((s * L['hip'][0], L['hip'][1], L['hip'][2]))
        if L['thigh']: ellipsoid(bm, hip, L['thigh'])
        (fc, fr) = L['foot']; foot = V((s * fc[0], fc[1], fc[2]))
        pts = [hip] + ([V((s * L['knee'][0], L['knee'][1], L['knee'][2]))] if L['knee'] else []) + \
              ([V((s * L['ankle'][0], L['ankle'][1], L['ankle'][2]))] if L['ankle'] else []) + [foot + V((0, .03, .02))]
        if L['r']: chain(bm, pts, L['r'], L['r'] * .9)
        if L['knee']: ellipsoid(bm, V((s * L['knee'][0], L['knee'][1], L['knee'][2])), (L['r'] * 1.3,) * 3)
        ellipsoid(bm, foot, fr)
        for k in (-1, 0, 1):                 # three toes
            ellipsoid(bm, foot + V((k * fr[0] * .55, -fr[1] * .78, -fr[2] * .25)), (fr[0] * .34, fr[0] * .4, fr[2] * .62))
    legs = to_object('Legs', bm, ['red', 'horn'])
    sculpt(legs, .007)
    bm = edit(legs)
    for s in s3:
        (fc, fr) = L['foot']; foot = V((s * fc[0], fc[1], fc[2]))
        for k in (-1, 0, 1):
            tip = foot + V((k * fr[0] * .55, -fr[1] * 1.08, -fr[2] * .45))
            cone(bm, tip + V((0, .012, .006)), (0, -1, -.35), fr[0] * .32, fr[0] * .16, 1)
    done(legs, bm); reduce(legs, 6000)

    # Arms: upper arm, elbow, forearm, hand, three claws; one object per arm
    A = T['arm']; arms = []
    for s, name in ((-1, 'ArmL'), (1, 'ArmR')):
        X = lambda p: V((s * p[0], p[1], p[2]))
        bm = bmesh.new()
        chain(bm, [X(A['sh']), X(A['el'])], A['r'][0], A['r'][0] * .95)
        chain(bm, [X(A['el']), X(A['ha'])], A['r'][1], A['r'][1] * .95)
        ellipsoid(bm, X(A['ha']) + V((0, -.01, -.02)), (A['hand'],) * 3)
        if A.get('delt'): ellipsoid(bm, X(A['sh']), (A['delt'],) * 3)
        if A.get('bicep'): b = A['bicep']; ellipsoid(bm, X(b[:3]), (b[3], b[3], b[3] * 1.1))
        if A.get('elbow'): ellipsoid(bm, X(A['el']), (A['elbow'],) * 3)
        arm = to_object(name, bm, ['red', 'horn'])
        sculpt(arm, .006)
        bm = edit(arm); h = X(A['ha']) + V((0, -.01, -.02))
        for k in (-1, 0, 1):
            cone(bm, h + V((k * A['hand'] * .55, -A['hand'] * .7, -A['hand'] * .55)), (k * .3, -.6, -1), A['hand'] * .5, A['hand'] * .2, 1)
        done(arm, bm); reduce(arm, 3000)
        set_origin(arm, X(A['sh'])); arms.append(arm)

    # Tail: a smooth tapering tail, spikes along the top, a spade at the end
    Tl = T['tail']; bm = bmesh.new()
    chain(bm, Tl['pts'], *Tl['r'])
    tail = to_object('Tail', bm, ['red', 'horn', 'dark'])
    sculpt(tail, .006)
    bm = edit(tail); path = catmull(Tl['pts'], 30)
    for k in (6, 11, 16, 21):                # spikes on top, getting smaller
        p, q = path[k], path[k + 1]; up = (q - p).cross(V((1, 0, 0))).normalized()
        if up.z < 0: up = -up
        r = Tl['r'][0] + (Tl['r'][1] - Tl['r'][0]) * k / 29
        cone(bm, p + up * r * .7, up + (q - p).normalized() * .6, Tl['spikes'] * (1.2 - k / 30), Tl['spikes'] * .45, 1)
    end, before = path[-1], path[-3]; d = (end - before).normalized()
    if Tl['droop']: d = (d + V((0, 0, -.8))).normalized()
    sz = .11 * Tl['spade']                   # the spade: two cones base to base, flattened
    side = d.cross(V((0, 0, 1))).normalized() if abs(d.z) < .9 else V((1, 0, 0))
    flat = Matrix.Scale(.3, 4, side)
    for direction, length in ((d, sz * 1.2), (-d, sz * .5)):
        g = bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=sz * .55, radius2=0, depth=length,
                                  matrix=Matrix.Translation(end + d * sz * .45 + direction * length / 2) @ flat @ aim(direction))
        tag(g, 2)
    done(tail, bm); reduce(tail, 4000)
    set_origin(tail, V(Tl['pts'][0]))

    # Head: skull, snout, cheeks fused; then horns, crest, cheek frills, nostrils, mouth, brows
    bm = bmesh.new()
    for c, r in T['head']: ellipsoid(bm, c, r)
    ellipsoid(bm, *T['snout'])
    if T['cheeks']:
        for s in s3: c, r = T['cheeks']; ellipsoid(bm, (s * c[0], c[1], c[2]), r)
    head = to_object('Head', bm, ['skin', 'horn', 'dark', 'white'])
    sculpt(head, .005, 20)
    dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(head, dg)
    def front(x, z):                         # where a ray from the front meets the head
        hit = bvh.ray_cast(V((x, -3, z)), V((0, 1, 0)))
        return (hit[0], hit[1]) if hit[0] else (None, None)
    def above(x, y):
        hit = bvh.ray_cast(V((x, y, 3)), V((0, 0, -1)))
        return (hit[0], hit[1]) if hit[0] else (None, None)
    def side(y, z, s):
        hit = bvh.ray_cast(V((s * 3, y, z)), V((-s, 0, 0)))
        return (hit[0], hit[1]) if hit[0] else (None, None)
    hc = T['head'][0][0]; hr = T['head'][0][1]; sc, sr = T['snout']
    bm = edit(head)
    H = T['horn']
    for s in s3:                             # horns sweep back from the top of the head
        p, n = above(s * H['x'], hc[1] + .05)
        if p is None: continue
        L = H['len']; droop = H['droop'] and s > 0
        pts = [p - V((0, 0, .02)), p + V((s * .03, .05, .07)) * L,
               p + V((s * .06, .14, .12 if not droop else .06)) * L, p + V((s * (.07 if not droop else .13), .23, .1 if not droop else -.01)) * L]
        tube(bm, pts, H['r'], .004, 1)
    for i, size in enumerate(T['crest']):    # crest spikes along the top of the head
        p, n = above(0, hc[1] - .06 + i * .1)
        if p is None: continue
        roll = (.3, -.25, .15)[i] if T['hunch'] else 0
        cone(bm, p - V((0, 0, .01)), (roll, .5 + i * .35, 1), size * 1.5, size * .5, 1)
    for s in s3:                             # cheek frills: three soft spikes fanning back
        p, n = side(hc[1] + .02, hc[2] - .01, s)
        if p is None: continue
        for k, (dz, ln) in enumerate(((.5, 1), (0, 1.25), (-.45, .9))):
            cone(bm, p - V((s * .02, 0, 0)), (s * 1, .7, dz), T['fins'] * ln * 1.6, T['fins'] * .4, 0)
    for s in s3:                             # nostrils
        p, n = front(s * sr[0] * .32, sc[2] + sr[2] * .42)
        if p is not None: ellipsoid(bm, p - n * .004, (.017, .012, .011), 2, 12, aim(n))
    # The mouth: a line cast onto the snout (a smile, a wide grin, or a small frown)
    mz = sc[2] - sr[2] * (.45 if T['mouth'] != 'frown' else .6)
    w, curve = {'smile': (.085, .03), 'grin': (.11, .03), 'frown': (.04, -.014)}[T['mouth']]
    pts = []
    for k in range(9):
        u = k / 8 * 2 - 1
        p, n = front(u * w, mz - curve * (1 - u * u))         # lowest in the middle for a smile
        if p is not None: pts.append(p + n * .003)
    if len(pts) > 3: tube(bm, pts, .009, .009, 2)
    if T['mouth'] in ('smile', 'grin'):     # one small fang (a smile), or two (a grin)
        for x in ((.035,) if T['mouth'] == 'smile' else (-.06, .06)):
            p, n = front(x, mz - curve * (1 - (x / w) ** 2) + .004)
            if p is not None: cone(bm, p + n * .002, (0, -.2, -1), .03, .012, 3, 10)
    # Brows: short arcs over the eyes, tilted for the mood
    E, Br = T['eye'], T['brow']
    for s in s3:
        pts = []
        for k in range(7):
            u = k / 6 * 2 - 1
            tilt = Br['tilt'] * u * s         # u * s = -1 at the inner end: positive tilt lowers it (determined), negative raises it (worried)
            p, n = front(s * E['x'] + u * Br['w'], E['z'] + Br['dz'] - abs(u) ** 2 * .015 + tilt * .03)
            if p is not None: pts.append(p + n * .004)
        if len(pts) > 3: tube(bm, pts, Br['r'], Br['r'] * .6, 2)
    done(head, bm)
    reduce(head, 11000)
    def head_colour(co, n):
        c = mix(RED, SNOUT, smoothstep(-(co.y - sc[1]) / sr[1], -.2, .6) * smoothstep(-co.z + sc[2] + sr[2] * 1.3, 0, .05))
        if T['cheeks']:
            for s in s3:
                c = mix(c, BLUSH, .7 * bump((V((co.x, co.z)) - V((s * .19, T['cheeks'][0][2]))).length, .045) * smoothstep(-n.y, .2, .6))
        return c
    paint(head, head_colour)

    # Eyes: white, big green iris, pupil, two highlights (and a lid on some types); one node each
    eyes = []
    for s, name in ((-1, 'EyeL'), (1, 'EyeR')):
        p, n = front(s * E['x'], E['z'])
        n = (n + V((0, -.6, 0))).normalized()  # face a little more to the front than the surface does
        r = E['r']; centre = p - n * r[2] * .3
        R = aim(n); bm = bmesh.new()
        local = lambda x, y, z: (Matrix.Translation(centre) @ R @ V((x, y, z)))
        ellipsoid(bm, centre, (r[0], r[1], r[2]), 0, 40, R)                                           # white
        ix = -s * .006
        # Each layer sits a little proud of the one behind it (front faces at 1.1, 1.17 and 1.24 of the
        # white's depth), or it disappears inside: iris, pupil, then the highlights.
        ellipsoid(bm, local(ix, -.008, r[2] * .8), (r[0] * .6, r[1] * .6, r[2] * .3), 1, 32, R)        # iris
        ellipsoid(bm, local(ix, -.011, r[2] * 1.0), (r[0] * .34, r[1] * .37, r[2] * .17), 2, 24, R)   # pupil
        ellipsoid(bm, local(ix + r[0] * .22, r[1] * .22, r[2] * 1.15), (r[0] * .17,) * 2 + (r[2] * .09,), 3, 16, R)
        ellipsoid(bm, local(ix - r[0] * .2, -r[1] * .28, r[2] * 1.12), (r[0] * .075,) * 2 + (r[2] * .06,), 3, 12, R)
        if E['lid']:                          # a heavy upper lid: the top of a slightly bigger sphere
            lb = bmesh.new()
            bmesh.ops.create_uvsphere(lb, u_segments=32, v_segments=24, radius=1, matrix=Matrix.Diagonal((r[0] * 1.08, r[1] * 1.08, r[2] * 1.2, 1)))
            cut = r[1] * 1.08 * (1 - 2 * E['lid'])                 # lid covers this share of the eye's height
            bmesh.ops.delete(lb, geom=[v for v in lb.verts if v.co.y < cut], context='VERTS')
            for f in lb.faces: f.material_index = 4
            lb.transform(Matrix.Translation(centre) @ R)
            me = bpy.data.meshes.new('lid'); lb.to_mesh(me); lb.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
        eye = to_object(name, bm, ['white', 'iris', 'pupil', 'shine', 'red'])
        set_origin(eye, centre); eyes.append(eye)

    # Wings: the 2D membrane outline (torn on the bedraggled type), with bones along the edges
    W = T['wing']; wings = []
    U = 1 / 280
    outline = [(104, 214), (70, 190), (40, 150), (22, 110), (46, 118), (62, 112), (70, 98), (78, 124), (94, 132), (108, 128), (104, 150), (108, 176), (118, 196)]
    def bez(p0, p1, p2, p3, n=10):
        return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3)) for t in (k / n for k in range(n))]
    pts2d = []
    for i in range(0, 12, 3): pts2d += bez(outline[i], outline[i + 1], outline[i + 2], outline[(i + 3) % 13])
    pts2d.append(outline[12])
    if W['tatty']:                            # nicks in the free edge, pulled towards the root
        rx, ry = outline[0]
        pts2d = [((x + (rx - x) * .3, y + (ry - y) * .3) if (12 < i < len(pts2d) - 3 and i % 4 == 2) else (x, y)) for i, (x, y) in enumerate(pts2d)]
    bones = [[(104, 214), (70, 190), (40, 150), (22, 110)], [(100, 206), (80, 176), (72, 140), (70, 100)], [(100, 206), (92, 180), (96, 150), (108, 128)]]
    for s, name in ((-1, 'WingL'), (1, 'WingR')):
        root = V((s * W['root'][0], W['root'][1], W['root'][2]))
        # wing plane: outward (u) and up (v), swept back about the vertical
        M = Matrix.Translation(root) @ Matrix.Rotation(s * W['sweep'], 4, 'Z') @ Matrix.Scale(W['scale'], 4)   # tips back (+y)
        # 2D x < 100 is outward: to the viewer's left for the left wing (s = -1), right for the right
        to3 = lambda x, y, depth=0: M @ V((s * (100 - x) * U, depth, (205 - y) * U))
        bm = bmesh.new()
        front_v = [bm.verts.new(to3(x, y, -.006)) for x, y in pts2d]
        back_v = [bm.verts.new(to3(x, y, .006)) for x, y in pts2d]
        bm.faces.new(front_v); bm.faces.new(back_v[::-1])
        k = len(pts2d)
        for i in range(k):
            bm.faces.new((front_v[i], back_v[i], back_v[(i + 1) % k], front_v[(i + 1) % k]))
        for f in bm.faces: f.material_index = 0
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for i, b in enumerate(bones):
            tube(bm, [to3(*q) for q in bez(*b, n=8)] + [to3(*b[3])], .02 if i == 0 else .013, .006, 1, 16, 10)
        wing = to_object(name, bm, ['wing', 'red'])
        set_origin(wing, root); wings.append(wing)

    # Hierarchy, pivots and names
    for o in (body, legs, tail, head, *arms, *eyes, *wings): smooth_shade(o)
    root = empty('Dragon')
    set_origin(body, (0, 0, T['hip'])); set_origin(head, T['head_at']); set_origin(legs, (0, 0, 0))
    parent(legs, root); parent(tail, root); parent(body, root)
    parent(head, body)
    for e in eyes: parent(e, head)
    for a in arms: parent(a, body)
    for w in wings: parent(w, body)

def export(type_name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PIVOT.clear()
    build(TYPES[type_name])
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'draig-%s.glb' % type_name)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True, export_normals=True,
                              export_vertex_color='ACTIVE', export_materials='EXPORT', export_animations=False)
    print('EXPORTED', path, os.path.getsize(path))

for t in TYPES: export(t)
