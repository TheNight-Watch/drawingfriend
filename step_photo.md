图片理解最佳实践
阶跃星辰视觉理解大模型支持在对话过程中传入图片文件用于理解图片当中的内容，参与大模型的对话过程中，通过图像来补充上下文，以实现诸如：基于图片追问、提问图片中的内容等能力。

目前推荐使用 step-1o-turbo-vision 模型。该模型拥有最强的视频理解能力，推荐默认开启 detail 模式。
能力限制
目前 step-1v/step-1o 系列模型 支持 JPG/JPEG、PNG、静态GIF、WebP 格式的图片，且支持通过 URL 或 Base64 作为参数传递。
目前 step-1v/step-1o 系列模型限制了单次请求图像不能超过 60 张，如果超过 60 张照片，可以先对图片进行描述，并作为上下文传入到请求当中。
如何实现图片理解
简单图片理解
在对话过程中，如果你需要将图片传递给大模型，则可以通过在传入的信息当中，加入 type 为 image_url 类型的内容，来完成对话。

阶跃星辰支持在 image_url 类型中使用 URL 或 Base64 格式的内容，为了保证更好的性能，推荐使用 URL 来完成图片参数的传递。

具体实现可以参考如下代码

from openai import OpenAI
import os
 
API_KEY= os.getenv("API_KEY")
client = OpenAI(api_key=API_KEY, base_url="https://api.stepfun.com/v1")
 
completion = client.chat.completions.create(
  model="step-1o-turbo-vision",
  messages=[
      {
          "role": "system",
          "content": "你是由阶跃星辰提供的AI聊天助手，你除了擅长中文，英文，以及多种其他语言的对话以外，还能够根据用户提供的图片，对内容进行精准的内容文本描述。在保证用户数据安全的前提下，你能对用户的问题和请求，作出快速和精准的回答。同时，你的回答和建议应该拒绝黄赌毒，暴力恐怖主义的内容",
      },
      # 在对话中传入图片，来实现基于图片的理解
      {
          "role": "user",
          "content": [
              {
                  "type": "text",
                  "text": "用优雅的语言描述这张图片",
              },
              {
                  "type": "image_url",
                  "image_url": {
                      "url": "https://www.stepfun.com/assets/section-1-CTe4nZiO.webp"
                  },
              },
          ],
      },
  ],
)
 
print(completion.model_dump_json(indent=3))
 
# 输出内容
# {
#    "id": "105e9027276481c141821b77b1b2a2f2.eeb4fc6f4b4e39921fe5fc5e2f33d57c",
#    "choices": [
#       {
#          "finish_reason": "stop",
#          "index": 0,
#          "logprobs": null,
#          "message": {
#             "content": "在这幅静谧的夜景中，一座现代建筑在微光中显得格外引人注目。建筑外墙上“ART WEST BUND”的字样在灯光的映衬下熠熠生辉，透露出浓厚的艺术气息。建筑前的广场宽敞而整洁，几盏路灯散发出温暖的光芒，为夜色增添了一丝浪漫。树木静静地矗立在广场上，仿佛在守护着这片宁静的艺术之地。远处的高楼在夜幕中若隐若现，与这座艺术殿堂相映成趣，共同构成了一幅充满现代感与艺术气息的都市夜景图。",
#             "refusal": null,
#             "role": "assistant",
#             "function_call": null,
#             "tool_calls": null
#          }
#       }
#    ],
#    "created": 1727073234,
#    "model": "step-1o-turbo-vision",
#    "object": "chat.completion",
#    "service_tier": null,
#    "system_fingerprint": null,
#    "usage": {
#       "completion_tokens": 130,
#       "prompt_tokens": 497,
#       "total_tokens": 627,
#       "completion_tokens_details": null,
#       "cached_tokens": 256
#    }
# }