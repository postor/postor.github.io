# =========================
# 图鉴系统 (Gallery System)
# album.rpy
# =========================

# -------------------------------------------------
# CG 数据定义（只需要改这里即可扩展）
# -------------------------------------------------
init python:
    # 每一项 = 一个结局CG
    # id        : Gallery 按钮ID
    # title     : 显示名称
    # image     : CG图片名（不带扩展）
    # condition : persistent 解锁条件（字符串）
    cg_list = [
        {
            "id": "historical_ending",
            "title": "法之代价",
            "image": "cg_historical_end",
            "condition": "persistent.ending_historical",
        },
        {
            "id": "happy_ending",
            "title": "功成身退",
            "image": "cg_happy_end",
            "condition": "persistent.ending_happy",
        },
        {
            "id": "mediocre_ending",
            "title": "碌碌无为",
            "image": "cg_mediocre_end",
            "condition": "persistent.ending_mediocre",
        },
    ]


# -------------------------------------------------
# 自动生成锁定图片（灰度 + 模糊）
# -------------------------------------------------
init python:
    for cg in cg_list:
        renpy.image(
            cg["image"] + "_locked",
            im.Blur(im.Grayscale(cg["image"] + ".png"), 3.0)
        )
        renpy.image(
            cg["image"] + "_full",
            im.Scale(cg["image"] + ".png", 1920, 1080, bilinear=True)
        )


# -------------------------------------------------
# 初始化 Gallery
# -------------------------------------------------
init python:
    g = Gallery()
    g.transition = dissolve
    g.navigation = False

    for cg in cg_list:
        g.button(cg["id"])
        g.condition(cg["condition"])
        g.image(cg["image"] + "_full")


# =========================
# 图鉴界面
# =========================
screen album():
    tag menu

    # 背景
    add "bg_palace_hall" at bg_full

    # 标题
    frame:
        xalign 0.5
        yalign 0.1
        padding (20, 10)
        background "#00000080"

        text "结局图鉴" size 40 color "#ffffff"

    # 图鉴主体
    frame:
        xalign 0.5
        yalign 0.55
        xsize 1100
        ysize 600
        background "#00000060"
        padding (30, 30)

        vbox:
            spacing 20

            text "点击已解锁的图片查看完整CG" size 20 color "#cccccc" xalign 0.5

            # 根据 CG 数量自动排布
            grid len(cg_list) 1:
                spacing 30
                xalign 0.5

                for cg in cg_list:

                    vbox:
                        spacing 10

                        if eval(cg["condition"]):
                            # 已解锁
                            add g.make_button(
                                cg["id"],
                                Transform(cg["image"], size=(300, 200)),
                                xalign=0.5
                            )

                            text cg["title"] size 22 color "#ffffff" xalign 0.5
                            text "已解锁" size 16 color "#4CAF50" xalign 0.5

                        else:
                            # 未解锁
                            button:
                                xysize (300, 200)
                                xalign 0.5
                                add Transform(cg["image"] + "_locked", size=(300, 200))
                                action NullAction()

                            text cg["title"] size 22 color "#888888" xalign 0.5
                            text "未解锁" size 16 color "#888888" xalign 0.5

    # 返回按钮
    textbutton "返回":
        xalign 0.5
        yalign 0.95
        style "navigation_button"
        action Return()


# =========================
# 按钮样式
# =========================
style navigation_button:
    size_group "navigation"
    xalign 0.5

style navigation_button_text:
    size 24
    color "#ffffff"
    hover_color "#ffff00"
