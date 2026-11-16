package com.habboubah.bildklar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import java.io.File

/**
 * The home-screen widget: "On this day" with a photo from an earlier year, or
 * the space that could be freed. The app writes what to show (title, line and
 * a small JPEG) through PhotoLibraryPlugin.setWidget; the widget only reads
 * those — it never opens the photo library itself. A tap opens the app.
 */
class BildklarWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        update(context, manager, ids)
    }

    companion object {
        const val PREFS = "bildklar-widget"
        const val IMAGE = "widget.jpg"

        /** Redraws every Bildklar widget on the home screen. */
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, BildklarWidget::class.java))
            if (ids.isNotEmpty()) update(context, manager, ids)
        }

        fun update(context: Context, manager: AppWidgetManager, ids: IntArray) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.widget_bildklar)
            val title = prefs.getString("title", null)
            if (title != null) {
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_line, prefs.getString("line", "") ?: "")
            }
            val file = File(context.filesDir, IMAGE)
            val photo = if (file.exists()) BitmapFactory.decodeFile(file.absolutePath) else null
            if (photo != null) {
                views.setImageViewBitmap(R.id.widget_photo, photo)
                views.setViewVisibility(R.id.widget_photo, View.VISIBLE)
                views.setTextColor(R.id.widget_title, Color.WHITE)
                views.setTextColor(R.id.widget_line, Color.WHITE)
            } else {
                views.setViewVisibility(R.id.widget_photo, View.GONE)
                views.setTextColor(R.id.widget_title, INK)
                views.setTextColor(R.id.widget_line, INK)
            }
            val open = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: Intent(context, MainActivity::class.java)
            val tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            views.setOnClickPendingIntent(R.id.widget_root, tap)
            manager.updateAppWidget(ids, views)
        }

        /** The app's slate ink (src/index.css). */
        private val INK = Color.rgb(0x1C, 0x23, 0x2B)
    }
}
