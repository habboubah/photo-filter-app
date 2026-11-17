package com.habboubah.bildklar

import android.app.Activity
import android.app.Dialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.MediaController
import android.widget.VideoView

/**
 * A video played inside the app: a full-screen black dialog with the
 * platform's VideoView and its MediaController — no dependency, no other app,
 * nothing leaves the phone. A tap shows the controls (play / pause, seek);
 * Back or the round close button ends it. The screen stays on while it plays.
 * `onClosed` runs once: `failed` is true when the phone can't play the file
 * (the platform's own "can't play" alert is suppressed; the app says it).
 */
object VideoPlayer {
    fun show(activity: Activity, uri: Uri, closeLabel: String, onClosed: (failed: Boolean) -> Unit) {
        val dialog = Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        val density = activity.resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val root = FrameLayout(activity).apply { setBackgroundColor(Color.BLACK) }
        val video = VideoView(activity)
        // MATCH_PARENT and centred: VideoView measures itself to the video's aspect ratio inside the screen.
        root.addView(video, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER))

        val close = ImageButton(activity).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            imageTintList = ColorStateList.valueOf(Color.WHITE)
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.argb(140, 40, 40, 40)) }
            contentDescription = closeLabel
            setOnClickListener { dialog.dismiss() }
        }
        val closeParams = FrameLayout.LayoutParams(dp(44), dp(44), Gravity.TOP or Gravity.START).apply {
            marginStart = dp(16); topMargin = dp(16)
        }
        root.addView(close, closeParams)
        // Clear of the status bar, the cut-out and the gesture bar.
        root.setOnApplyWindowInsetsListener { _, insets ->
            val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            closeParams.topMargin = dp(16) + bars.top
            closeParams.marginStart = dp(16) + if (root.layoutDirection == View.LAYOUT_DIRECTION_RTL) bars.right else bars.left
            close.layoutParams = closeParams
            root.setPadding(0, 0, 0, bars.bottom)
            insets
        }

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
