import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";


export default class InvertWindow extends Extension
{
    enable() {
        this.InvertEffectGo = GObject.registerClass(InvertEffect); // Register the JS class with GObject so GNOME knows it as a GObject type.
        this.enable_shortcuts();
    }

    disable() {
        this.disable_shortcuts();
        this.remove_all_invert_effects();
        this.InvertEffectGo = null;
    }

    ///////////////////////////////////////

    enable_shortcuts() {
        let settings = this.getSettings();
        Main.wm.addKeybinding(
            'invert-focused-window',
            settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => { this.toggle_effect_on_focused_window(); }
        );
        Main.wm.addKeybinding(
            'invert-global', // Keybinding name matching your schema key
            settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => { this.toggle_effect_global(); }
        );
    }

    disable_shortcuts() {
        Main.wm.removeKeybinding('invert-focused-window');
        Main.wm.removeKeybinding('invert-global');
    }

    remove_all_invert_effects() {
        global.get_window_actors().forEach((actor) => {
            actor.remove_effect_by_name('invert-color');
        });
        Main.uiGroup.remove_effect_by_name('invert-color');
    }

    ///////////////////////////////////////

    toggle_effect_on_focused_window() {
        let focusedWindowObj = global.display.focus_window;
        if (!focusedWindowObj) return;

        let focusedWindowVisualActorObj = focusedWindowObj.get_compositor_private();
        if (!focusedWindowVisualActorObj) return;
        
        if (focusedWindowVisualActorObj.get_effect('invert-color')) focusedWindowVisualActorObj.remove_effect_by_name('invert-color');
        else focusedWindowVisualActorObj.add_effect_with_name('invert-color', new this.InvertEffectGo());
    }

    toggle_effect_global() {
        if (Main.uiGroup.get_effect('invert-color')) Main.uiGroup.remove_effect_by_name('invert-color');
        else Main.uiGroup.add_effect_with_name('invert-color', new this.InvertEffectGo());
    }

};

class InvertEffect extends Clutter.ShaderEffect
{
    vfunc_get_static_shader_source() {
        return `
            uniform sampler2D tex;
            void main() {
                vec4 color = texture2D(tex, cogl_tex_coord_in[0].st);
                if (color.a > 0.0) {
                    color.rgb /= color.a;
                }
                color.rgb = vec3(1.0, 1.0, 1.0) - color.rgb;
                color.rgb *= color.a;
                cogl_color_out = color * cogl_color_in;
            }
        `;
    }
}