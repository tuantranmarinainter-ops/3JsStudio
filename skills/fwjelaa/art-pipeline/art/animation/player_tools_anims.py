"""Player work animations: dig (also bury), chop, mine, put down, craft. Load after rig_helpers.py and zombie_anims.py.

The tool is welded to the right hand by client/Game/ActionEffects.luau so it points along the hand's backward axis.
Swinging the arm chain forward rotates it: with S = torso + upper arm + lower arm + hand pitch, the tool points
(0, -sin S, cos S) in (up, back) terms, so S ~ 110 aims it down-forward into the ground, S ~ 180 straight ahead and
S ~ 210 forward and up. Every key below is written with that sum in mind. Right hand grips the top of the handle,
left hand reaches lower down the shaft (lat > 0 on the left arm pulls it in toward the middle).
"""

STANCE = {  # feet apart, left foot a little forward: the base every work loop returns to
    "LU": (14, -5, 0), "LL": (16, 0, 0), "LT": (-7, 0, 0),
    "RU": (-7, 5, 0), "RL": (13, 0, 0), "RT": (-4, 0, 0),
}


def _with_stance(spec):
    out = dict(STANCE)
    out.update(spec)
    return out


def dig(frames=36):
    """Foot on the shovel, push it in, lever the dirt up and toss it over the left shoulder."""
    ready = _with_stance({
        "L": (8, 0, 0, (0, -0.1, 0)), "T": (14, 0, 0), "H": (-8, 0, 0),
        "RA": (70, -8, 0), "RF": (30, 0, 0), "RH": (10, 0, 0),  # S = 132: blade on the ground in front
        "LA": (45, 18, 0), "LF": (35, 0, 0), "LH": (0, 0, 0),
    })
    keys = [
        (1, ready),
        (8, {"L": (6, 0, 0, (0, 0.05, 0)), "T": (10, 0, 0), "H": (-4, 0, 0),
             "RA": (62, -8, 0), "RF": (22, 0, 0), "RH": (8, 0, 0),  # S = 108: shaft upright, blade going in
             "LA": (40, 18, 0), "LF": (30, 0, 0),
             "RU": (34, 4, 0), "RL": (48, 0, 0), "RT": (-10, 0, 0),  # right foot up on the blade
             "LU": (10, -5, 0), "LL": (14, 0, 0)}),
        (13, {"L": (10, 0, 0, (0, -0.25, 0)), "T": (18, 0, 0), "H": (-2, 0, 0),
              "RA": (58, -8, 0), "RF": (26, 0, 0), "RH": (6, 0, 0),  # weight down: S = 118
              "LA": (42, 18, 0), "LF": (34, 0, 0),
              "RU": (26, 4, 0), "RL": (40, 0, 0), "RT": (-6, 0, 0),
              "LU": (22, -5, 0), "LL": (34, 0, 0), "LT": (-12, 0, 0)}),
        (20, _with_stance({"L": (4, 0, 0, (0, -0.1, 0.05)), "T": (2, 0, -6), "H": (-4, 0, 0),
                           "RA": (96, -6, 0), "RF": (40, 0, 0), "RH": (14, 0, 0),  # lever up: S = 156
                           "LA": (70, 16, 0), "LF": (40, 0, 0)})),
        (27, _with_stance({"L": (2, 0, 10, (0, 0, 0)), "T": (-6, -4, 28), "H": (-10, -6, -10),
                           "RA": (128, -14, 0), "RF": (32, 0, 0), "RH": (24, 0, 0),  # toss: S = 180
                           "LA": (110, 20, 0), "LF": (30, 0, 0)})),
        (33, ready),
    ]
    return table_pose(keys)


def _swing(wind, strike, recoil, frames):
    """A two-handed overhead swing that lands in front of the body (axe on a trunk, pickaxe on a rock)."""
    ready = _with_stance({
        "L": (4, 0, 0, (0, 0, 0)), "T": (6, 0, 0), "H": (-4, 0, 0),
        "RA": (40, -6, 0), "RF": (40, 0, 0), "RH": (20, 0, 0),  # S = 110: tool resting down-forward
        "LA": (36, 16, 0), "LF": (40, 0, 0), "LH": (0, 0, 0),
    })
    keys = [
        (1, ready),
        (wind[0], wind[1]),
        (strike[0], strike[1]),
        (recoil[0], recoil[1]),
        (frames - 3, ready),
    ]
    return table_pose(keys)


def chop_player(frames=30):
    wind = (9, _with_stance({"L": (-4, 0, 6, (0, 0.05, 0.05)), "T": (-10, 0, 14), "H": (-10, 0, -6),
                             "RA": (168, -4, 0), "RF": (14, 0, 0), "RH": (40, 0, 0),  # S = 208: axe up over the head
                             "LA": (160, 10, 0), "LF": (18, 0, 0)}))
    # measured in Studio: the blade has to be near level (S ~ 180) to land on a trunk at chest height
    strike = (13, {"L": (10, 0, -4, (0, -0.2, 0)), "T": (24, 0, -8), "H": (6, 0, 4),
                   "RA": (80, -8, 0), "RF": (20, 0, 0), "RH": (45, 0, 0),  # S = 179: blade into the trunk
                   "LA": (70, 18, 0), "LF": (24, 0, 0),
                   "LU": (22, -5, 0), "LL": (28, 0, 0), "RU": (-2, 5, 0), "RL": (24, 0, 0)})
    recoil = (16, {"T": (20, 0, -6), "RA": (84, -8, 0), "RF": (22, 0, 0), "RH": (42, 0, 0), "LA": (72, 18, 0)})
    return _swing(wind, strike, recoil, frames)


def mine_player(frames=36):
    wind = (12, _with_stance({"L": (-6, 0, 0, (0, 0.08, 0.08)), "T": (-14, 0, 4), "H": (-14, 0, 0),
                              "RA": (172, -4, 0), "RF": (10, 0, 0), "RH": (44, 0, 0),  # S = 206
                              "LA": (166, 8, 0), "LF": (12, 0, 0),
                              "LU": (10, -5, 0), "LL": (10, 0, 0)}))
    # measured in Studio: S ~ 150 puts the point on the ground about three studs in front, where the rock is
    strike = (16, {"L": (16, 0, 0, (0, -0.45, 0.1)), "T": (30, 0, 0), "H": (10, 0, 0),
                   "RA": (62, -8, 0), "RF": (14, 0, 0), "RH": (28, 0, 0),  # S = 150
                   "LA": (52, 18, 0), "LF": (20, 0, 0),
                   "LU": (30, -5, 0), "LL": (44, 0, 0), "LT": (-14, 0, 0), "RU": (6, 5, 0), "RL": (36, 0, 0)})
    recoil = (20, {"T": (26, 0, 0), "RA": (66, -8, 0), "RF": (18, 0, 0), "RH": (30, 0, 0), "LA": (56, 18, 0)})
    return _swing(wind, strike, recoil, frames)


def put_down(frames=24):
    """From hands-up carrying: bend knees and waist, lower the body in front, straighten back to idle."""
    carry1 = carry_idle(60)(1)
    idle1 = idle_player(60)(1)
    bend = {"L": (20, 0, 0, (0, -0.6, 0.2)), "T": (24, 0, 0), "H": (8, 0, 0),
            "LA": (74, -6, 0), "RA": (74, 6, 0), "LF": (12, 0, 0), "RF": (12, 0, 0), "LH": (-6, 0, 0), "RH": (-6, 0, 0),
            "LU": (40, -3, 0), "LL": (62, 0, 0), "LT": (-22, 0, 0), "RU": (40, 3, 0), "RL": (62, 0, 0), "RT": (-22, 0, 0)}
    low = table_pose([(1, {}), (2, bend)])(2)

    def pose(f):
        if f <= 10:
            return lerp_pose(carry1, low, smooth((f - 1) / 9))
        if f <= 13:
            return low
        return lerp_pose(low, idle1, smooth((f - 13) / (frames - 13)))

    return pose


def craft(frames=24):
    """Planing a plank on the workbench: both arms push forward together, the torso rocks with them."""
    pull = _with_stance({"L": (6, 0, 0, (0, -0.05, 0)), "T": (8, 0, 0), "H": (16, 0, 0),
                         "RA": (40, -12, 0), "RF": (70, 0, 0), "RH": (-10, 0, 0),
                         "LA": (40, 12, 0), "LF": (70, 0, 0), "LH": (-10, 0, 0)})
    push = _with_stance({"L": (10, 0, 0, (0, -0.1, -0.12)), "T": (20, 0, 0), "H": (22, 0, 0),
                         "RA": (78, -10, 0), "RF": (22, 0, 0), "RH": (-14, 0, 0),
                         "LA": (78, 10, 0), "LF": (22, 0, 0), "LH": (-14, 0, 0),
                         "LU": (20, -5, 0), "LL": (22, 0, 0)})
    return table_pose([(1, pull), (11, push), (frames, pull)])


PLAYER_TOOLS = {
    # name: (pose factory, frames, loops)
    "Player_Dig": (dig, 36, True),
    "Player_Chop": (chop_player, 30, True),
    "Player_Mine": (mine_player, 36, True),
    "Player_PutDown": (put_down, 24, False),
    "Player_Craft": (craft, 24, True),
}
