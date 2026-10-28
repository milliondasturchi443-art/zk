package app.zk.webview

import android.app.Activity
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Surface
import android.view.TextureView
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.view.animation.DecelerateInterpolator
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var splashOverlay: FrameLayout
    private lateinit var videoSurface: TextureView

    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())

    private var pageFinished = false
    private var surfaceReady = false
    private var playerReady = false
    private var playbackStartMs = 0L
    private var splashHidden = false
    private var retrying = false

    private val MIN_PLAY_MS = 2500L
    private val MAX_SPLASH_MS = 15000L
    private val START_URL = "https://zk-web.onrender.com/"

    private val playWatcher = object : Runnable {
        override fun run() {
            maybeHideSplash()
            if (!splashHidden) handler.postDelayed(this, 250)
        }
    }

    private val fallbackTimer = Runnable { hideSplash() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        splashOverlay = findViewById(R.id.splashOverlay)
        videoSurface = findViewById(R.id.videoSurface)

        setupWebView()
        setupVideo()

        handler.post(playWatcher)
        handler.postDelayed(fallbackTimer, MAX_SPLASH_MS)
    }

    private fun setupWebView() {
        val settings = webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            javaScriptCanOpenWindowsAutomatically = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            textZoom = 100
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            settings.forceDark = WebSettings.FORCE_DARK_OFF
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?, request: WebResourceRequest?
            ): Boolean {
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                pageFinished = true
                maybeHideSplash()
                super.onPageFinished(view, url)
            }

            override fun onReceivedError(
                view: WebView?, request: WebResourceRequest?, error: WebResourceError?
            ) {
                if (request?.isForMainFrame != true) return
                val transient = error?.errorCode in TRANSIENT_ERRORS
                if (transient && !retrying) {
                    retrying = true
                    handler.postDelayed({
                        retrying = false
                        view?.reload()
                    }, 2000)
                }
                super.onReceivedError(view, request, error)
            }
        }

        webView.loadUrl(START_URL)
    }

    private fun setupVideo() {
        videoSurface.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                surfaceReady = true
                startPlayer(surface)
                updateCrop()
            }

            override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {
                updateCrop()
            }

            override fun onSurfaceTextureDestroyed(surface: SurfaceTexture) = false

            override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit
        }

        videoSurface.viewTreeObserver.addOnGlobalLayoutListener { updateCrop() }
    }

    private fun startPlayer(surface: SurfaceTexture) {
        if (mediaPlayer != null) return
        val player = MediaPlayer()
        try {
            player.setDataSource(
                this,
                Uri.parse("android.resource://$packageName/${R.raw.loadingvideo}")
            )
            player.setSurface(Surface(surface))
            player.isLooping = true
            player.setOnPreparedListener {
                playerReady = true
                playbackStartMs = System.currentTimeMillis()
                it.start()
                maybeHideSplash()
            }
            player.setOnErrorListener { _, _, _ ->
                hideSplash()
                true
            }
            player.prepareAsync()
            mediaPlayer = player
        } catch (e: Exception) {
            mediaPlayer = null
            hideSplash()
        }
    }

    private fun updateCrop() {
        val player = mediaPlayer ?: return
        val vw = videoSurface.width
        val vh = videoSurface.height
        if (vw == 0 || vh == 0) return
        val vW = player.videoWidth
        val vH = player.videoHeight
        if (vW == 0 || vH == 0) return

        val scale = maxOf(vw.toFloat() / vW, vh.toFloat() / vH)
        val dx = (vw - vW * scale) / 2f
        val dy = (vh - vH * scale) / 2f
        val matrix = Matrix().apply {
            setScale(scale, scale)
            postTranslate(dx, dy)
        }
        videoSurface.setTransform(matrix)
    }

    private fun maybeHideSplash() {
        if (splashHidden) return
        if (!surfaceReady || !playerReady) return
        val playedEnough =
            mediaPlayer?.isPlaying == true && System.currentTimeMillis() - playbackStartMs >= MIN_PLAY_MS
        if (pageFinished && playedEnough) hideSplash()
    }

    private fun hideSplash() {
        if (splashHidden) return
        splashHidden = true
        handler.removeCallbacks(fallbackTimer)

        // Step 1: Video fades out while WebView fades in from 0 → 1 over 600ms
        val fadeOut = AlphaAnimation(1f, 0f).apply {
            duration = 600
            fillAfter = true
            interpolator = AccelerateDecelerateInterpolator()
        }
        splashOverlay.startAnimation(fadeOut)

        val fadeIn = AlphaAnimation(0f, 1f).apply {
            duration = 600
            fillAfter = true
            interpolator = DecelerateInterpolator()
            setAnimationListener(object : Animation.AnimationListener {
                override fun onAnimationStart(animation: Animation?) {}
                override fun onAnimationEnd(animation: Animation?) {
                    webView.alpha = 1f
                    webView.clearAnimation()
                }
                override fun onAnimationRepeat(animation: Animation?) {}
            })
        }
        webView.startAnimation(fadeIn)

        // Stop video player after fade completes
        handler.postDelayed({
            splashOverlay.visibility = View.GONE
            mediaPlayer?.let {
                try { it.stop() } catch (_: Exception) {}
                it.release()
            }
            mediaPlayer = null
        }, 650)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        mediaPlayer?.release()
        mediaPlayer = null
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private val TRANSIENT_ERRORS = setOf(
            WebViewClient.ERROR_HOST_LOOKUP,
            WebViewClient.ERROR_CONNECT,
            WebViewClient.ERROR_TIMEOUT,
            WebViewClient.ERROR_IO,
        )
    }
}