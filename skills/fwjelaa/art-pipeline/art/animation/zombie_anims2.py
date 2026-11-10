"""Zombie animations (idle, shamble, rise, chop, mine, bonk). Load after rig_helpers.py and zombie_anims.py."""

HUNCH = {  # the zombie's resting stance, shared by idle / work / bonk so every transition lands on it
    "L": (4, 0, 0), "T": (18, 0, 0), "H": (-4, 6, 0),
    "LA": (25, -6, 0), "RA": (25, 6, 0), "LF": (35, 0, 0), "RF": (35, 0, 0), "LH": (-10, 0, 0), "RH": (-10, 0, 0),
    "LU": (8, -2, 0), "RU": (8, 2, 0), "LL": (14, 0, 0), "RL": (14, 0, 0), "LT": (-6, 0, 0), "RT": (-6, 0, 0),
}


def idle_zombie(frames=72):
    def pose(f):
        t = (f - 1) / frames
        twitch = math.exp(-(((t - 0.64) / 0.025) ** 2))  # one sharp jerk of the right arm per loop
        return {
            "LowerTorso": P("LowerTorso", pitch=4 + 0.8 * s(t), lat=3.0 * s(t, 0.4),
                            loc=(0.05 * s(t, 0.4), 0.02 * s(t), 0)),
            "UpperTorso": P("UpperTorso", pitch=17 + 1.6 * s(t, 0.6), lat=-2.5 * s(t, 0.4), twist=3.0 * s(t, 1.2)),
            "Head": P("Head", pitch=-4 + 5.0 * s(t, 0.9), lat=9.0 * s(t, 1.1), twist=7.0 * s(t, 1.7)),
            "LeftUpperArm": P("LeftUpperArm", pitch=24 + 3.5 * s(t, 0.5), lat=-6 - 1.5 * s(t, 0.2)),
            "RightUpperArm": P("RightUpperArm", pitch=26 + 3.5 * s(t, 1.1) + 16 * twitch, lat=6 + 1.5 * s(t, 0.8)),
            "LeftLowerArm": P("LeftLowerArm", pitch=34 + 5.0 * s(t, 0.9)),
            "RightLowerArm": P("RightLowerArm", pitch=36 + 5.0 * s(t, 1.5) + 14 * twitch),
            "LeftHand": P("LeftHand", pitch=-10 + 6.0 * s(t, 1.3)),
            "RightHand": P("RightHand", pitch=-10 + 6.0 * s(t, 1.9) - 18 * twitch),
            "LeftUpperLeg": P("LeftUpperLeg", pitch=8, lat=-2),
            "RightUpperLeg": P("RightUpperLeg", pitch=6, lat=2),
            "LeftLowerLeg": P("LeftLowerLeg", pitch=14 + 1.5 * s(t, 0.5)),
            "RightLowerLeg": P("RightLowerLeg", pitch=12 + 1.5 * s(t, 1.0)),
            "LeftFoot": P("LeftFoot", pitch=-6),
            "RightFoot": P("RightFoot", pitch=-6, lat=3),
        }

    return pose


def shamble(frames=36):
    """Uneven 36-frame lurch: the left leg steps, the right foot drags; arms reach out, head lolls behind."""

    def pose(f):
        t = (f - 1) / frames
        a = TAU * t
        l_swing = 24 * math.cos(a)  # normal step
        r_swing = 14 * math.cos(a + math.pi) - 2  # shorter, dragging step
        l_flex = 8 + 46 * max(0.0, -math.sin(a - 0.15 * math.pi)) ** 1.2
        r_flex = 10 + 16 * max(0.0, -math.sin(a + math.pi - 0.15 * math.pi)) ** 1.2  # drag: barely lifts
        lunge = max(0.0, math.cos(a))  # the whole body falls into the left step
        return {
            "LowerTorso": P("LowerTorso", pitch=5 + 2 * lunge, lat=7 * math.cos(a + 0.3), twist=-6 * math.cos(a),
                            loc=(0.16 * math.cos(a + math.pi), 0.10 * math.cos(2 * a + 0.5) - 0.05, 0)),
            "UpperTorso": P("UpperTorso", pitch=19 + 3 * lunge, lat=-6 * math.cos(a + 0.3), twist=11 * math.cos(a)),
            "Head": P("Head", pitch=-6 + 8 * math.cos(2 * a + 1.0), lat=13 * math.cos(a + 1.2), twist=-8 * math.cos(a)),
            "LeftUpperArm": P("LeftUpperArm", pitch=66 + 9 * math.cos(a + math.pi), lat=-8),
            "RightUpperArm": P("RightUpperArm", pitch=70 + 9 * math.cos(a), lat=8),
            "LeftLowerArm": P("LeftLowerArm", pitch=14 + 7 * math.cos(2 * a)),
            "RightLowerArm": P("RightLowerArm", pitch=18 + 7 * math.cos(2 * a + 1)),
            "LeftHand": P("LeftHand", pitch=-18 + 8 * math.cos(a + 2.0)),
            "RightHand": P("RightHand", pitch=-18 + 8 * math.cos(a + 3.0)),
            "LeftUpperLeg": P("LeftUpperLeg", pitch=l_swing, lat=-3),
            "RightUpperLeg": P("RightUpperLeg", pitch=r_swing, lat=3),
            "LeftLowerLeg": P("LeftLowerLeg", pitch=l_flex),
            "RightLowerLeg": P("RightLowerLeg", pitch=r_flex),
            "LeftFoot": P("LeftFoot", pitch=-0.45 * l_swing + 0.25 * l_flex),
            "RightFoot": P("RightFoot", pitch=-18 - 0.2 * r_swing + 0.15 * r_flex),  # toe scuffs along the ground
        }

    return pose


def rise(frames=72):
    idle1 = idle_zombie(72)(1)
    keys = [
        (1, {"L": (48, 0, 0, (0, -2.15, 0.9)), "T": (36, 0, 0), "H": (42, 0, 0), "LA": (165, -10, 0), "RA": (165, 10, 0),
             "LF": (8, 0, 0), "RF": (8, 0, 0), "LH": (0, 0, 0), "RH": (0, 0, 0), "LU": (95, -4, 0), "RU": (95, 4, 0),
             "LL": (118, 0, 0), "RL": (118, 0, 0), "LT": (-22, 0, 0), "RT": (-22, 0, 0)}),
        (10, {"T": (38, 0, -8), "H": (32, 6, 8), "RA": (174, 14, 0), "LA": (140, -4, 0), "RF": (20, 0, 0), "LF": (4, 0, 0),
              "RH": (-26, 0, 0), "L": (46, 0, 0, (0.05, -2.1, 0.9))}),
        (18, {"T": (32, 0, 8), "H": (24, -6, -8), "LA": (178, -14, 0), "RA": (142, 6, 0), "LF": (22, 0, 0), "RF": (6, 0, 0),
              "LH": (-26, 0, 0), "RH": (0, 0, 0), "L": (44, 0, 0, (-0.05, -1.95, 0.85))}),
        (28, {"L": (30, 0, 0, (0, -1.2, 0.5)), "T": (42, 0, 0), "H": (22, 0, 0), "LA": (118, -8, 0), "RA": (108, 8, 0),
              "LF": (30, 0, 0), "RF": (30, 0, 0), "LU": (70, -3, 0), "RU": (68, 3, 0), "LL": (88, 0, 0), "RL": (86, 0, 0),
              "LT": (-14, 0, 0), "RT": (-14, 0, 0)}),
        (40, {"L": (18, 3, -4, (0.04, -0.5, 0.2)), "T": (30, 0, 8), "H": (8, 0, 0), "LA": (82, -8, 0), "RA": (72, 8, 0),
              "LF": (26, 0, 0), "RF": (22, 0, 0), "LU": (30, -3, 0), "RU": (28, 3, 0), "LL": (42, 0, 0), "RL": (40, 0, 0),
              "LT": (-8, 0, 0), "RT": (-8, 0, 0)}),
        (50, {"L": (8, 8, 6, (0.12, -0.12, 0)), "T": (21, 6, 12), "H": (-6, 13, -15), "LA": (62, -8, 0), "RA": (52, 10, 0),
              "LF": (20, 0, 0), "RF": (28, 0, 0), "LU": (16, -3, 0), "RU": (6, 5, 0), "LL": (24, 0, 0), "RL": (12, 0, 0),
              "LT": (-6, 0, 0), "RT": (-6, 0, 0)}),
        (58, {"L": (5, -6, -4, (-0.08, -0.05, 0)), "T": (19, -5, -10), "H": (8, -14, 12), "LA": (48, -6, 0),
              "RA": (56, 6, 0)}),
    ]
    base = table_pose(keys)

    def pose(f):
        if f <= 58:
            return base(f)
        return lerp_pose(base(58), idle1, smooth((f - 58) / 14))

    return pose


def _work(twist, diagonal):
    rest = dict(HUNCH)
    return [
        (1, rest),
        (8, {"L": (2, 0, 0, (0, 0.05, 0)), "T": (2, 0, twist * -0.7), "H": (-10, 0, 0),
             "LA": (100, -8, 0), "RA": (100, 8, 0), "LF": (50, 0, 0), "RF": (50, 0, 0), "LU": (4, -2, 0), "RU": (4, 2, 0),
             "LL": (8, 0, 0), "RL": (8, 0, 0)}),
        (12, {"L": (-2, 0, twist * -0.4, (0.04, 0.12, 0)), "T": (-12, 0, twist * -1.2), "H": (-16, 0, 6),
              "LA": (152, -10, 0), "RA": (152, 10, 0), "LF": (55, 0, 0), "RF": (55, 0, 0), "LU": (-2, -2, 0),
              "RU": (-2, 2, 0), "LL": (4, 0, 0), "RL": (4, 0, 0), "LT": (-2, 0, 0), "RT": (-2, 0, 0)}),
        (14, {"L": (8, 0, 0, (0, -0.25, 0.1)), "T": (10, 0, twist * 0.2), "H": (0, 0, 0), "LA": (80, -8, 0),
              "RA": (80, 8, 0), "LF": (30, 0, 0), "RF": (30, 0, 0), "LU": (18, -2, 0), "RU": (18, 2, 0), "LL": (30, 0, 0),
              "RL": (30, 0, 0), "LT": (-12, 0, 0), "RT": (-12, 0, 0)}),
        (15, {"L": (14, diagonal, twist * 0.5, (0, -0.55, 0.2)), "T": (34, diagonal * -0.6, twist),
              "H": (18, 0, -6), "LA": (28, -6, 0), "RA": (28, 6, 0), "LF": (20, 0, 0), "RF": (20, 0, 0),
              "LU": (32, -2, 0), "RU": (32, 2, 0), "LL": (52, 0, 0), "RL": (52, 0, 0), "LT": (-26, 0, 0),
              "RT": (-26, 0, 0)}),
        (17, {"L": (13, diagonal, twist * 0.5, (0, -0.5, 0.2)), "T": (31, diagonal * -0.6, twist * 0.92),
              "LA": (32, -6, 0), "RA": (32, 6, 0), "H": (16, 0, -4)}),
        (23, {"L": (10, diagonal * 0.4, twist * 0.3, (0, -0.35, 0.1)), "T": (26, 0, twist * 0.4), "H": (14, 0, 0),
              "LA": (42, -6, 0), "RA": (42, 6, 0), "LF": (42, 0, 0), "RF": (42, 0, 0), "LU": (22, -2, 0), "RU": (22, 2, 0),
              "LL": (38, 0, 0), "RL": (38, 0, 0), "LT": (-14, 0, 0), "RT": (-14, 0, 0)}),
        (31, {"L": (6, 0, 0, (0, -0.1, 0)), "T": (20, 0, twist * 0.1), "H": (2, 5, 0), "LA": (30, -6, 0), "RA": (30, 6, 0),
              "LF": (38, 0, 0), "RF": (38, 0, 0), "LU": (12, -2, 0), "RU": (12, 2, 0), "LL": (20, 0, 0), "RL": (20, 0, 0)}),
    ]


def chop(frames=36):
    return table_pose(_work(twist=0, diagonal=0))


def mine(frames=36):
    return table_pose(_work(twist=22, diagonal=-8))


def bonk(frames=24):
    idle1 = idle_zombie(72)(1)
    keys = [
        (1, dict(HUNCH)),
        (3, {"L": (-4, 0, 0, (0, 0, 0.35)), "T": (-12, 0, 6), "H": (-34, 0, 10), "LA": (62, -20, 0), "RA": (58, 20, 0),
             "LF": (40, 0, 0), "RF": (46, 0, 0), "LU": (0, 0, 0), "RU": (4, 0, 0), "LL": (10, 0, 0), "RL": (14, 0, 0)}),
        (7, {"L": (-6, 4, 0, (0, -0.05, 0.6)), "T": (-14, 5, 8), "H": (-18, 10, 6), "LA": (46, -16, 0), "RA": (36, 18, 0),
             "LU": (-12, -3, 0), "RU": (18, 3, 0), "LL": (30, 0, 0), "RL": (10, 0, 0)}),
        (11, {"L": (3, -6, -4, (0.1, 0, 0.2)), "T": (6, 8, -10), "H": (10, 14, 12), "LA": (35, -12, 0), "RA": (12, 14, 0),
              "LF": (50, 0, 0), "RF": (30, 0, 0), "LU": (6, -3, 0), "RU": (4, 3, 0), "LL": (16, 0, 0), "RL": (16, 0, 0)}),
        (16, {"L": (4, 3, 2, (0, 0, 0.05)), "T": (14, -3, 4), "H": (6, -6, -4), "LA": (28, -8, 0), "RA": (26, 8, 0)}),
    ]
    base = table_pose(keys)

    def pose(f):
        if f <= 16:
            return base(f)
        return lerp_pose(base(16), idle1, smooth((f - 16) / 8))

    return pose
