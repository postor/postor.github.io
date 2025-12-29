## game/language_setup.rpy

# 用于记录是否已经在首次启动时选择了语言
default persistent.first_language_chosen = False

# 启动画面标签：Ren'Py 在显示主菜单前会先运行这里
label splashscreen:
    # 如果没有选择过语言，则强制显示选择界面
    if not persistent.first_language_chosen:
        call screen language_selection_screen(is_first_run=True)
    return

screen language_selection_screen(is_first_run=False):
    # 确保此屏幕替换掉其他菜单屏幕
    tag menu
    
    # 模态窗口，强制交互
    modal True

    # 使用现有背景
    if main_menu:
        add gui.main_menu_background
    else:
        add gui.game_menu_background

    # 使用确认框的样式框架，保持视觉一致性且居中
    frame:
        style_prefix "confirm"
        xalign 0.5
        yalign 0.5
        padding (60, 60) # 稍微加大内边距

        vbox:
            xalign 0.5
            spacing 45

            # 标题：使用双语显示
            label "Language / 语言":
                style "confirm_prompt"
                text_size 40
                xalign 0.5

            # 简体中文按钮 (默认语言)
            # Language(None) 切换回基础脚本语言（通常是中文）
            textbutton "简体中文":
                style "confirm_button"
                xalign 0.5
                action [
                    Language(None), 
                    SetField(persistent, "first_language_chosen", True), 
                    If(is_first_run, Return(), NullAction())
                ]

            # 英文按钮
            # Language("english") 切换到 tl/english
            textbutton "English":
                style "confirm_button"
                xalign 0.5
                action [
                    Language("english"), 
                    SetField(persistent, "first_language_chosen", True), 
                    If(is_first_run, Return(), NullAction())
                ]

            # 如果不是首次运行（是从菜单进入的），显示返回按钮
            if not is_first_run:
                null height 20 # 增加一点间距
                textbutton _("返回"):
                    style "confirm_button"
                    xalign 0.5
                    action Return()