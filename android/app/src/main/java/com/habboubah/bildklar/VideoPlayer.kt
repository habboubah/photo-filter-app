package com.habboubah.bildklar

import android.app.Activity
import android.app.Dialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.MediaController
import android.widget.VideoView

/**
 * A video played inside the app — no dependency, no other app, nothing leaves
 * the phone. It opens as a WINDOW over the dimmed app, about the size of a
 * large photo (the platform's VideoView fits the video's shape inside it), with
 * the MediaController (play / pause, seek, the time; a tap on the video shows
 * it), a round close button and a Bigger / Smaller button that lets the window
 * fill the screen and back. Back, the close button or a tap beside the window
 * ends it. The screen stays on while it plays. `onClosed` runs once: `failed`
 * is true when the phone can't play the file (the platform's own "can't play"
 * alert is suppressed; the app says it).
 */
object VideoPlayer {
    fun show(
        activity: Activity, uri: Uri, closeLabel: String, biggerLabel: String, smallerLabel: String,
        onClosed: (failed: Boolean) -> Unit,
    ) {
        val dialog = Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar_Fullscreen)
        val density = activity.resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val dim = Color.argb(160, 0, 0, 0)
        val root = FrameLayout(activity).apply { setBackgroundColor(dim) }
        // The window: black, rounded, centred; the video inside measures itself to its own shape.
        val corners = GradientDrawable().apply { setColor(Color.BLACK); cornerRadius = dp(20).toFloat() }
        val box = FrameLayout(activity).apply { background = corners; clipToOutline = true; isClickable = true }
        val boxParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER)
        root.addView(box, boxParams)
        val video = VideoView(activity)
        box.addView(video, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))

        fun round(icon: Int, label: String) = ImageButton(activity).apply {
            setImageResource(icon)
            imageTintList = ColorStateList.valueOf(Color.WHITE)
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.argb(140, 30, 30, 30)) }
            contentDescription = label
        }
        val close = round(android.R.drawable.ic_menu_close_clear_cancel, closeLabel).apply { setOnClickListener { dialog.dismiss() } }
        val size = round(R.drawable.ic_video_bigger, biggerLabel)
        box.addView(close, FrameLayout.LayoutParams(dp(44), dp(44), Gravity.TOP or Gravity.START).apply { marginStart = dp(8); topMargin = dp(8) })
        box.addView(size, FrameLayout.LayoutParams(dp(44), dp(44), Gravity.TOP or Gravity.END).apply { marginEnd = dp(8); topMargin = dp(8) })

        // Windowed: margins round it and at most about 70 % of the screen's height; big: the whole screen, black.
        var big = false
        var bars = android.graphics.Insets.NONE
        fun layout() {
            val screen = activity.resources.displayMetrics.heightPixels
            if (big) {
                root.setBackgroundColor(Color.BLACK)
                root.setPadding(0, bars.top, 0, bars.bottom)
                boxParams.setMargins(0, 0, 0, 0)
                boxParams.height = ViewGroup.LayoutParams.MATCH_PARENT
                corners.cornerRadius = 0f
                size.setImageResource(R.drawable.ic_video_smaller)
                size.contentDescription = smallerLabel
            } else {
                root.setBackgroundColor(dim)
                val v = maxOf(bars.top, bars.bottom, (screen * 0.15).toInt())
                root.setPadding(0, v, 0, v)
                boxParams.setMargins(dp(16), 0, dp(16), 0)
                boxParams.height = ViewGroup.LayoutParams.WRAP_CONTENT
                corners.cornerRadius = dp(20).toFloat()
                size.setImageResource(R.drawable.ic_video_bigger)
                size.contentDescription = biggerLabel
            }
            box.layoutParams = boxParams
        }
        size.setOnClickListener { big = !big; layout() }
        root.setOnClickListener { if (!big) dialog.dismiss() }
        // Clear of the status bar, the cut-out and the gesture bar.
        root.setOnApplyWindowInsetsListener { _, insets ->
            bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            layout()
            insets
        }
        layout()

        var failed = false
        val controller = MediaController(activity)
        controller.setAnchorView(video)
        video.setMediaController(controller)
        video.setOnPreparedListener { video.start(); controller.show(2500) }
        video.setOnCompletionListener { controller.show(0) }
        video.setOnErrorListener { _, _, _ ->
            failed = true
            dialog.dismiss()
            true
        }
        video.setVideoURI(uri)

        dialog.setContentView(root)
        dialog.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        dialog.setOnDismissListener {
            controller.hide()
            video.stopPlayback()
            onClosed(failed)
        }
        dialog.show()
    }
}
