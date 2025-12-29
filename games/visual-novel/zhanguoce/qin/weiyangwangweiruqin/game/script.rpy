# =========================
# 商君书：秦殇
# 主剧情脚本（沉浸重制版）
# =========================

# -------------------------
# 定义角色
# -------------------------
# 使用更符合古典氛围的颜色
define sy = Character("商君", color="#a3d9a5", what_prefix="“", what_suffix="”")
define xg = Character("秦孝公", color="#aeb0d6", what_prefix="“", what_suffix="”")
define hw = Character("秦惠王", color="#d6aeb0", what_prefix="“", what_suffix="”")
define tutor = Character("公子虔", color="#b5b5b5", what_prefix="“", what_suffix="”") # 太子傅具体化为公子虔
define advisor = Character("甘龙", color="#8f8f8f", what_prefix="“", what_suffix="”") #以此代表反对派/进谗者
define narrator = Character(None, what_italic=True)

# -------------------------
# 游戏变量
# -------------------------
default fear_level = 0 # 恐惧值/威慑力

# =========================
# 序章：入秦
# =========================
label start:

    scene bg_qin_palace_dusk at bg_full
    with fade

    # 旁白带入氛围
    voice "audio/战国乱世，风云激荡。魏国的土地上，曾有一位志士，怀揣着无人能懂的帝王之术，在这个黄昏踏入了秦国的宫殿.MP3"
    "战国乱世，风云激荡。魏国的土地上，曾有一位志士，怀揣着无人能懂的帝王之术，在这个黄昏踏入了秦国的宫殿。"
    voice "audio/他叫卫鞅，后世称他为 —— 商君。.MP3"
    "他叫卫鞅，后世称他为——商君。"
    
    voice "audio/大殿之上，烛火摇曳。秦孝公嬴渠梁眼中的渴望，如同饥饿的野狼。.MP3"
    "大殿之上，烛火摇曳。秦孝公嬴渠梁眼中的渴望，如同饥饿的野狼。"

    show xiaogong determined at char_right
    
    voice "audio/先生入秦三日，畅谈霸道之术。寡人听之，如饮烈酒，五内俱焚！.MP3"
    xg "先生入秦三日，畅谈霸道之术。寡人听之，如饮烈酒，五内俱焚！"
    voice "audio/但这秦国积贫积弱，老世族盘根错节。先生之法若行，恐要流血漂橹。先生…… 敢吗？.MP3"
    xg "但这秦国积贫积弱，老世族盘根错节。先生之法若行，恐要流血漂橹。先生……敢吗？"

    show shangyang confident at char_left
    
    voice "audio/公如青山，鞅如松柏。若主公不负鞅，鞅必为秦国铸就一副铁石心肠，开万世基业！.MP3"
    sy "公如青山，鞅如松柏。若主公不负鞅，鞅必为秦国铸就一副铁石心肠，开万世基业！"
    
    voice "audio/君臣相视，那一刻，秦国的命运齿轮开始转动。.MP3"
    "君臣相视，那一刻，秦国的命运齿轮开始转动。"

    hide xiaogong
    hide shangyang
    with dissolve

    voice "audio/卫鞅被封左庶长，变法之令初下，整个秦国为之震动。.MP3"
    "卫鞅被封左庶长，变法之令初下，整个秦国为之震动。"

    jump tutor_challenge


# =========================
# 第一章：法与血
# =========================
label tutor_challenge:

    scene bg_court_day at bg_full
    with dissolve
    
    voice "audio/新法颁布未久，挑战便接踵而至。.MP3"
    "新法颁布未久，挑战便接踵而至。"
    voice "audio/太子赢驷触犯禁条，这是对新法最直接的挑衅。朝堂之上，旧贵族们屏息凝视，等着看卫鞅的笑话。.MP3"
    "太子赢驷触犯禁条，这是对新法最直接的挑衅。朝堂之上，旧贵族们屏息凝视，等着看卫鞅的笑话。"

    show shangyang stern at char_left
    show tutor arrogant at char_right

    voice "audio/卫鞅！太子乃国之储君，未来的秦王！你难道要为了区区一条禁令，刑罚储君吗？.MP3"
    tutor "卫鞅！太子乃国之储君，未来的秦王！你难道要为了区区一条禁令，刑罚储君吗？"
    voice "audio/若是如此，这秦国还是赢姓的秦国吗？.MP3"
    tutor "若是如此，这秦国还是赢姓的秦国吗？"

    voice "audio/卫鞅手握法简，指节微微发白。他知道，今日若退一步，新法便是废纸一张。.MP3"
    "卫鞅手握法简，指节微微发白。他知道，今日若退一步，新法便是废纸一张。"

    menu:
        "（内心）法之不行，自上犯之。":
            voice "audio/正因是储君，才更应为万民表率！.MP3"
            sy "（眼神如刀）正因是储君，才更应为万民表率！"
            jump capital_move

        "（内心）根基未稳，暂且退让。":
            voice "audio/太傅所言极是，储君不可加刑。.MP3"
            sy "（犹豫）……太傅所言极是，储君不可加刑。"
            jump mediocre_ending


# =========================
# 第二章：立信
# =========================
label capital_move:

    voice "audio/卫鞅的声音在朝堂上回荡，冰冷而决绝。.MP3"
    "卫鞅的声音在朝堂上回荡，冰冷而决绝。"

    voice "audio/太子犯法，与庶民同罪。然储君不可施刑，其过在于教导无方！.MP3"
    sy "太子犯法，与庶民同罪。然储君不可施刑，其过在于教导无方！"
    voice "audio/来人！将太子傅公子虔、公孙贾拿下！黥面、劓鼻，以正法典！.MP3"
    sy "来人！将太子傅公子虔、公孙贾拿下！黥面、劓鼻，以正法典！"

    play sound "sfx_punishment.ogg" # 假设有音效
    scene bg_blood_splatter at bg_full with vpunch
    
    voice "audio/刑具落下，血溅当场。太傅的惨叫声撕裂了秦国旧贵族的尊严，也彻底立下了商君的威严。.MP3"
    "刑具落下，血溅当场。太傅的惨叫声撕裂了秦国旧贵族的尊严，也彻底立下了商君的威严。"
    
    $ fear_level += 10

    scene bg_city_gate at bg_full
    with fade

    voice "audio/此后十年，道不拾遗，山无盗贼。秦人不敢私斗，闻战则喜。.MP3"
    "此后十年，道不拾遗，山无盗贼。秦人不敢私斗，闻战则喜。"
    voice "audio/卫鞅封于商地，号商君。他的名字，成为了秦国最锋利的剑，也成为了无数人心头最深的恐惧。.MP3"
    "卫鞅封于商地，号商君。他的名字，成为了秦国最锋利的剑，也成为了无数人心头最深的恐惧。"

    jump duke_illness


# =========================
# 第三章：抉择
# =========================
label duke_illness:

    scene bg_bedroom_night at bg_full
    with fade

    voice "audio/孝公二十四年，冬。那个支持了商君一辈子的男人，倒下了。.MP3"
    "孝公二十四年，冬。那个支持了商君一辈子的男人，倒下了。"
    voice "audio/病榻前，药味浓重。秦孝公屏退左右，只留商君一人。.MP3"
    "病榻前，药味浓重。秦孝公屏退左右，只留商君一人。"

    show xiaogong ill at char_right
    show shangyang sad at char_left

    voice "audio/商君…… 咳咳…… 这秦国是你我二人一手捏造的。寡人的儿子赢驷，虽有才干，但心胸狭隘，且与你有旧怨。.MP3"
    xg "商君……咳咳……这秦国是你我二人一手捏造的。寡人的儿子赢驷，虽有才干，但心胸狭隘，且与你有旧怨。"
    voice "audio/寡人担心，我死之后，他容不下你，更容不下这法。.MP3"
    xg "寡人担心，我死之后，他容不下你，更容不下这法。"
    
    voice "audio/孝公突然紧紧抓住商君的手，眼中闪过一丝疯狂的光芒。.MP3"
    "孝公突然紧紧抓住商君的手，眼中闪过一丝疯狂的光芒。"

    voice "audio/若秦国无你，必乱。卫鞅，寡人欲效法尧舜…….MP3"
    xg "若秦国无你，必乱。卫鞅，寡人欲效法尧舜……"
    voice "audio/这秦王之位，传于你，如何？.MP3"
    xg "这秦王之位，传于你，如何？"

    voice "audio/商君瞳孔猛缩。这是至高无上的信任，也是万劫不复的深渊。.MP3"
    "商君瞳孔猛缩。这是至高无上的信任，也是万劫不复的深渊。"

    menu:
        "严词拒绝，恪守臣节":
            voice "audio/主公！秦乃赢姓之秦，鞅乃外客。废长立幼、传位外臣，此乃取乱之道！.MP3"
            sy "主公！秦乃赢姓之秦，鞅乃外客。废长立幼、传位外臣，此乃取乱之道！"
            voice "audio/鞅此生只为秦法，不图秦国！请主公收回成命！.MP3"
            sy "鞅此生只为秦法，不图秦国！请主公收回成命！"
            voice "audio/商君叩首流血，孝公长叹一声，眼神逐渐黯淡。.MP3"
            "商君叩首流血，孝公长叹一声，眼神逐渐黯淡。"
            jump huiwang_ascends

        "深受感动，默然受之":
            voice "audio/主公知遇之恩，鞅…… 愿担此重任，以保秦法不灭。.MP3"
            sy "主公知遇之恩，鞅……愿担此重任，以保秦法不灭。"
            voice "audio/商君并未察觉，殿外屏风后，一双阴毒的眼睛正死死盯着他。.MP3"
            "商君并未察觉，殿外屏风后，一双阴毒的眼睛正死死盯着他。"
            jump coup_ending


# =========================
# 分支结局：血色政变
# =========================
label coup_ending:

    scene bg_throne_blood at bg_full
    with vpunch

    voice "audio/孝公崩逝的消息刚刚传出，商君尚未走出寝殿，四周便亮起了无数火把。.MP3"
    "孝公崩逝的消息刚刚传出，商君尚未走出寝殿，四周便亮起了无数火把。"

    show tutor angry at char_right
    show advisor cunning at char_center
    
    voice "audio/乱臣贼子卫鞅！竟敢蛊惑先王传位外姓！.MP3"
    tutor "乱臣贼子卫鞅！竟敢蛊惑先王传位外姓！"
    voice "audio/老世族隐忍二十年，等的就是你露出破绽的这一刻！.MP3"
    advisor "老世族隐忍二十年，等的就是你露出破绽的这一刻！"

    voice "audio/我乃受先王遗命…….MP3"
    sy "我乃受先王遗命……"

    voice "audio/没有任何辩解的机会。在 “清君侧、诛篡逆” 的怒吼中，早已埋伏好的死士一拥而上。.MP3"
    "没有任何辩解的机会。在“清君侧、诛篡逆”的怒吼中，早已埋伏好的死士一拥而上。"
    voice "audio/商君甚至没能看一眼他亲手建立的法制帝国，便倒在了孝公的病榻之前。.MP3"
    "商君甚至没能看一眼他亲手建立的法制帝国，便倒在了孝公的病榻之前。"
    voice "audio/他的血流淌在秦宫的地板上，与旧贵族的狂欢融为一体。.MP3"
    "他的血流淌在秦宫的地板上，与旧贵族的狂欢融为一体。"

    "【结局：谋逆之罪】"
    "历史记载：商君欲窃神器，贵族起兵诛之，夷三族，法度虽存，人亡政息。"
    
    $ persistent.ending_coup = True

    "【CG已解锁：谋逆之罪】"
    return


# =========================
# 第四章：图穷匕见
# =========================
label huiwang_ascends:

    scene bg_court_gloomy at bg_full
    with fade

    voice "audio/孝公死，太子赢驷即位，是为秦惠王。.MP3"
    "孝公死，太子赢驷即位，是为秦惠王。"
    voice "audio/新君即位，朝堂上的气氛变得诡异而压抑。.MP3"
    "新君即位，朝堂上的气氛变得诡异而压抑。"
    
    voice "audio/商君告归封地，但这并不能消除新王的猜忌。.MP3"
    "商君告归封地，但这并不能消除新王的猜忌。"

    scene bg_whisper at bg_full
    show huiwang cold at char_right
    show advisor cunning at char_left

    voice "audio/大王，如今秦国只知有商君之法，不知有大王之法。.MP3"
    advisor "大王，如今秦国只知有商君之法，不知有大王之法。"
    voice "audio/妇人婴儿皆言‘商君公允’，却无人谈及大王恩德。.MP3"
    advisor "妇人婴儿皆言‘商君公允’，却无人谈及大王恩德。"
    voice "audio/大臣太重者国危，左右太亲者身危。商君已成大王心腹大患，且他当年刑罚大王之师…….MP3"
    advisor "大臣太重者国危，左右太亲者身危。商君已成大王心腹大患，且他当年刑罚大王之师……"
    
    voice "audio/多年前的黥劓之耻，寡人一日未敢忘。商鞅……他确实太‘重’了。.MP3"
    hw "（阴沉）多年前的黥劓之耻，寡人一日未敢忘。商鞅……他确实太‘重’了。"

    voice "audio/一封早已准备好的‘谋反’奏折，送到了惠王的案头。.MP3"
    "一封早已准备好的‘谋反’奏折，送到了惠王的案头。"

    jump historical_ending


# =========================
# 历史结局：车裂之刑
# =========================
label historical_ending:

    scene cg_chelie at bg_full
    with fade

    voice "audio/彤云密布，渭水河畔。.MP3"
    "彤云密布，渭水河畔。"
    voice "audio/曾经权倾天下的商君，此刻被五马分尸的绳索束缚。.MP3"
    "曾经权倾天下的商君，此刻被五马分尸的绳索束缚。"
    
    # show shangyang resigned at char_center

    voice "audio/围观的秦人神情麻木，无人怜悯。因为他制定的连坐之法，让这些百姓对他既敬又恨。.MP3"
    "围观的秦人神情麻木，无人怜悯。因为他制定的连坐之法，让这些百姓对他既敬又恨。"
    voice "audio/商君抬头望向咸阳城的方向，嘴角露出一丝苦笑.MP3"
    "商君抬头望向咸阳城的方向，嘴角露出一丝苦笑。"

    voice "audio/法已入骨，秦已成势。杀我一人，无损秦法万世基业。.MP3"
    sy "法已入骨，秦已成势。杀我一人，无损秦法万世基业。"
    voice "audio/孝公…… 鞅，来赴约了。.MP3"
    sy "孝公……鞅，来赴约了。"

    play sound "sfx_tear.ogg"
    scene black with vpunch

    voice "audio/惠王车裂商君以徇，曰：‘莫如商央反者！’.MP3"
    "惠王车裂商君以徇，曰：‘莫如商央反者！’"
    voice "audio/然而，商君虽死，秦法未败。秦国依旧沿着他铺设的轨道，如战车般碾向六国。.MP3"
    "然而，商君虽死，秦法未败。秦国依旧沿着他铺设的轨道，如战车般碾向六国。"

    "【结局：法之代价】"

    $ persistent.ending_historical = True
    "【CG已解锁：法之代价】"
    return


# =========================
# 失败结局：碌碌无为
# =========================
label mediocre_ending:

    scene cg_mediocre_end at bg_full
    
    voice "audio/因为对旧贵族的妥协，新法变成了一纸空文。.MP3"
    "因为对旧贵族的妥协，新法变成了一纸空文。"
    voice "audio/贵族们依旧夜夜笙歌，百姓依旧贫弱不堪。魏国的军队再次攻破了河西之地。.MP3"
    "贵族们依旧夜夜笙歌，百姓依旧贫弱不堪。魏国的军队再次攻破了河西之地。"

    voice "audio/卫鞅，看来你也不是那个能救秦国的人。.MP3"
    xg "（失望）卫鞅，看来你也不是那个能救秦国的人。"

    voice "audio/卫鞅黯然离开秦国，消失在历史的尘埃中。秦国继续在函谷关内苟延残喘，等待着被吞并的命运。.MP3"
    "卫鞅黯然离开秦国，消失在历史的尘埃中。秦国继续在函谷关内苟延残喘，等待着被吞并的命运。"

    "【结局：变法失败】"
    
    $ persistent.ending_mediocre = True
    "【CG已解锁：变法失败】"
    return
