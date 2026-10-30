package expo.modules.labelocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class LabelOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LabelOcr")

    AsyncFunction("recognize") { uri: String ->
      recognize(uri)
    }
  }

  private fun recognize(uri: String): String {
    val context = appContext.reactContext ?: throw Exception("Camera text reading is not ready.")
    val image = InputImage.fromFilePath(context, Uri.parse(uri))
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    val latch = CountDownLatch(1)
    var text = ""
    var failure: Exception? = null
    recognizer.process(image)
      .addOnSuccessListener { result ->
        text = result.text ?: ""
        latch.countDown()
      }
      .addOnFailureListener { error ->
        failure = Exception(error.message ?: "The label could not be read.")
        latch.countDown()
      }
    if (!latch.await(20, TimeUnit.SECONDS)) {
      recognizer.close()
      throw Exception("The label could not be read.")
    }
    recognizer.close()
    failure?.let { throw it }
    return text
  }
}
