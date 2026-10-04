import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

const InvertEffectGo = GObject.registerClass(
    class InvertEffect extends Clutter.ShaderEffect {
        vfunc_get_static_shader_source() {
            return `
                // For each frame, this gets populated with the image (texture) of the thing in question - whether it's the whole screen, single window etc. (by COGL)
                uniform sampler2D tex;

                // Then for every pixel of the image, it runs this main function
                void main() {
                    // COGL gives the coordinates for the current pixel within the texture. .st gives us the S and T coordinates (basically X and Y)
                    vec2 pixelCoordinates = cogl_tex_coord_in[0].st;

                    // Look up the color of the pixel (RGBA: number values for color.r (red), color.g (green), color.b (blue), color.a (alpha/transparency)
                    vec4 originalColor = texture2D(tex, pixelCoordinates);

                    // RGB values are multiplied by the alpha. Undo it to get the actual color values. No point if 0 (fully transparent)
                    if (originalColor.a > 0.0) {
                        originalColor.rgb = originalColor.rgb / originalColor.a;
                    }

                    // Invert the RGB channels
                    vec3 invertedColor = vec3(1.0, 1.0, 1.0) - originalColor.rgb;

                    // Put the alpha multiplication back.
                    invertedColor = invertedColor * originalColor.a;

                    // Tell COGL what color should be drawn for this pixel
                    cogl_color_out = vec4(invertedColor, originalColor.a) * cogl_color_in;
                }
            `;
        }
    }
);

export default class InvertWindow extends Extension
{
    enable() {
        this.enable_shortcuts();
    }

    disable() {
        this.disable_shortcuts();
        this.remove_all_invert_effects();
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
        else focusedWindowVisualActorObj.add_effect_with_name('invert-color', new InvertEffectGo());
    }

    toggle_effect_global() {
        if (Main.uiGroup.get_effect('invert-color')) Main.uiGroup.remove_effect_by_name('invert-color');
        else Main.uiGroup.add_effect_with_name('invert-color', new InvertEffectGo());
    }

};