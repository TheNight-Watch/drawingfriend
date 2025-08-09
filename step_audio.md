开启实时语音通话
开启实时语音通话能力，支持语音和文本输入，并支持输出音频。

快速体验
我们提供了快速体验的 Demo，可以点击下方链接体验

Realtime API Demo
请求方式
WebSocket

请求地址
wss://api.stepfun.com/v1/realtime
请求头
Authorization string required
鉴权使用的 KEY，其值为 Bearer STEP_API_KEY
请求参数
model string required
需要使用的模型名称，当前仅支持 step-1o-audio
调用说明
Realtime API 需要在服务链接成功后，发送对应的 Client Event ，获取对应的 Server Event ，来完成交互。

公共参数
以下为 Client Event 和 Server Event 的公共参数

字段名	类型	描述
event_id	string	事件ID
type	string	Event 类型，可选项见下方说明
Client Event 列表
创建/更新 session
type: session.update

发送此事件以创建或更新会话的默认配置。客户端可以随时发送此事件来更新 session 配置，任何字段都可能随时更新，除了 "voice" 之外。服务器将使用 session.updated 事件进行响应。

modalities array<string>
模型可以使用的模态集。 固定为 ["text", "audio"]

instructions string
默认系统指令（即 system message）附加到 model 调用之前。此字段允许客户端指导模型获得所需的响应。该模型可以被指导回答内容和格式（例如，“要非常简洁”、“行为友好”、“这里有好回应的示例”）和音频行为（例如，“快声说”、“在你的声音中注入情感”、“经常大笑”）。不能保证模型会遵循这些说明，但它们会为模型提供有关所需行为的指导。

voice string
生成时使用的音色信息，支持官方音色，和自定义音色。自定义音色传入对应的音色 ID 即可，可以通过查询音色列表查看当前可用的音色 ID。

turn_detection object optional
ServerVAD参数，默认关闭

展开/收起
input_audio_format string
输入音频的格式。 当前仅支持 pcm16

output_audio_format string
输出音频的格式。 当前仅支持 pcm16

Sample

{
    "event_id": "event_abc",
    "type": "session.update",
    "session": {
        "modalities": ["text", "audio"],
        "instructions": "你是由阶跃星辰提供的AI聊天助手，你擅长中文，英文，以及多种其他语言的对话。",
        "voice": "linjiajiejie",
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16",
        "turn_detection": {
            "type": "server_vad"
        }
    }
}
音频内容追加
type: input_audio_buffer.append

发送此事件以将音频字节追加到输入音频缓冲区，服务器不会向此事件发送确认响应，在ServerVAD模式下会触发大模型推理。

audio string
编码的音频Base64编码字节。必须采用会话配置中 input_audio_format 字段指定的格式。
Sample

{
    "event_id": "event_abc",
    "type": "input_audio_buffer.append",
    "audio": "Base64EncodedAudioData"
}
音频内容提交
type: input_audio_buffer.commit

发送此事件以提交用户输入音频缓冲区进行推理，将在对话中创建新的用户消息项，服务器将使用 input_audio_buffer.committed 事件进行响应。如果输入音频缓冲区为空，则此事件将产生错误。

Sample

{
    "event_id": "event_abc",
    "type": "input_audio_buffer.commit"
}
音频内容清理
type: input_audio_buffer.clear

发送此事件以提交用户输入音频缓冲区进行清理，服务器将使用 input_audio_buffer.cleared 事件进行响应。

Sample

{
    "event_id": "event_abc",
    "type": "input_audio_buffer.clear"
}
会话消息添加
type: conversation.item.create

将新会话添加到会话上下文中，包括消息、函数调用和函数调用响应。此事件既可用于填充对话的 “历史记录” ，也可用于在途中添加新消息项，但当前限制是它无法填充 Assistant 音频消息。如果成功，服务器将使用 conversation.item.created 事件进行响应，否则将发送错误事件。

previous_item_id string
前一项消息的ID

content string
消息的内容，适用于消息项，见消息参数

Sample

{
    "event_id": "event_abc",
    "type": "conversation.item.create",
    "item": {
        "id": "msg_001",
        "type": "message",
        "role": "user",
        "content": [
            {
                "type": "input_text",
                "text": "你好"
            }
        ]
    }
}
会话消息删除
type: conversation.item.delete

当您想从对话历史记录中删除任何item时，发送此事件。服务器将使用 conversation.item.deleted 事件进行响应，当该item在对话历史记录中不存在，服务器将响应错误。

item_id string
想删除的消息ID
Sample

{
    "event_id": "event_abc",
    "type": "conversation.item.delete",
    "item_id": "msg_003"
}
推理提交
type: response.create

此事件指示服务器创建 Response，这意味着触发模型推理，服务端会返回

Sample

{
    "event_id": "event_abc",
    "type": "response.create"
}
推理取消
type: response.cancel

将此事件发送以取消正在进行的响应。服务器将返回一个 response.cancelled 事件或在没有可取消的响应时返回一个错误。

{
    "event_id": "event_abc",
    "type": "response.cancel"
}
Sever Event 列表
错误事件
type: error

服务器执行过程中发生错误时返回，这可能是客户端问题或服务器问题，会话会继续保留。

type string
错误类型（例如: “invalid_request_error”、“server_error”）。

code string
错误代码（如果有）。

message string
可解释的错误消息。

event_id string
导致错误的 client 事件的 event_id（如果适用）。

Sample

{
    "event_id": "event_bcd",
    "type": "error",
    "error": {
        "type": "invalid_request_error",
        "code": "invalid_param",
        "message": "音频内容不完整",
        "event_id": "event_567"
    }
}
创建session响应
type: session.created

创建 Session 时返回。当新连接建立为第一个服务器事件时自动发出。此事件将包含默认的 Session 配置。

modalities array<string>
模型可以使用的模态集。 固定为 ["text", "audio"]

instructions string
默认系统指令（即 system message）附加到 model 调用之前。此字段允许客户端指导模型获得所需的响应。该模型可以被指导回答内容和格式（例如，“要非常简洁”、“行为友好”、“这里有好回应的示例”）和音频行为（例如，“快声说”、“在你的声音中注入情感”、“经常大笑”）。不能保证模型会遵循这些说明，但它们会为模型提供有关所需行为的指导。

voice string
生成时使用的音色信息，支持官方音色，未来会支持自定义音色。

input_audio_format string
输入音频的格式。 当前仅支持 pcm16

output_audio_format string
输入音频的格式。 当前仅支持 pcm16

sample

{
    "event_id": "event_def",
    "type": "session.created",
    "session": {
        "id": "sess_001",
        "object": "realtime.session",
        "model": "step-1o-audio",
        "modalities": ["text", "audio"],
        "instructions": "你是由阶跃星辰提供的AI聊天助手，你擅长中文，英文，以及多种其他语言的对话。",
        "voice": "linjiajiejie",
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16",
        "max_response_output_tokens": "4096"
    }
}
更新session响应
type: session.updated

更新 Session 时返回。当新连接建立为第一个服务器事件时自动发出。此事件将包含默认的 Session 配置。

Sample

{
    "event_id": "event_def",
    "type": "session.created",
    "session": {
        "modalities": ["text", "audio"],
        "instructions": "你是由阶跃星辰提供的AI聊天助手，你擅长中文，英文，以及多种其他语言的对话。",
        "voice": "linjiajiejie",
        "input_audio_format": "pcm16",
        "output_audio_format": "pcm16",
        "max_response_output_tokens": "4096"
    }
}
音频输入激活开始 （VAD）
type: input_audio_buffer.speech_started

输入音频的人声有效输入开始事件通知，一般用于打断场景。

audio_start_ms string
音频的开始时间

item_id string
项目的 ID。

Sample

{
    "event_id": "event_bcd",
    "type": "input_audio_buffer.speech_started",
    "audio_start_ms": 1000,
    "item_id": "msg_003"
}
音频输入激活结束 （VAD）
type: input_audio_buffer.speech_stopped

输入音频的人声有效输入结束事件通知。

response_id string
一般为traceid。

item_id string
项目的 ID。

Sample

{
    "event_id": "event_1718",
    "type": "input_audio_buffer.speech_stopped",
    "audio_end_ms": 2000,
    "item_id": "msg_003"
}
音频内容流式返回
type: response.audio.delta

更新模型生成的音频时返回。

response_id string
一般为traceid。

item_id string
项目的 ID。

output_index string
响应中输出项的索引。

delta string
Base64 编码的音频数据增量，音频格式同session创建的output_audio_format

Sample

{
    "event_id": "event_bcd",
    "type": "response.audio.delta",
    "item_id": "msg_008",
    "delta": "Base64EncodedAudioDelta"
}
音频内容流式结束
type: response.audio.done

在模型生成的音频完成时返回。当 Response 中断、不完整或取消时也会发出.

response_id string
一般为traceid。

item_id string
项目的 ID。

{
    "event_id": "event_bcd",
    "type": "response.audio.done",
    "response_id": "traceid",
    "item_id": "msg_008"
}
音频内容文字流返回
type: response.audio_transcript.delta

当客户端提交输入音频缓冲区时返回。

response_id string
一般为traceid。

item_id string
项目的 ID。

output_index string
响应中输出项的索引。

delta string
转录增量。

{
    "event_id": "event_bcd",
    "type": "response.audio_transcript.delta",
    "item_id": "msg_002",
    "output_index": 0,
    "delta": "Hello, how can I a"
}
音频内容文字流结束
type: response.audio_transcript.done

当模型生成的音频输出转录完成流式处理时返回。当 Response 中断、不完整或取消时也会发出。

response_id string
一般为traceid。

item_id string
项目的 ID。

output_index string
响应中输出项的索引。

transcript string
音频的完整文字内容。

{
    "event_id": "event_4748",
    "type": "response.audio_transcript.done",
    "response_id": "resp_001",
    "item_id": "msg_008",
    "content_index": 0,
    "transcript": "Hello, how can I assist you today?"
}
会话消息创建响应
type: conversation.item.created

创建对话项时返回，服务器正在生成一个 Response，如果成功，将生成一个或两个 Item，其类型为 message；

id string
消息的唯一ID，非必需，如果客户端未提供，服务器将自动生成一个。

type string
项目的类型，通常为message

role string
消息发送者的角色（用户、助手、系统），仅适用于消息项。

status string
项目的状态 （completed， incomplete）。这些对会话没有影响。

content string
消息的内容，适用于消息项。

{
	"event_id": "event_bcd",
	"type": "conversation.item.created",
	"previous_item_id": "msg_001",
	"item": {
		"id": "msg_002",
		"object": "realtime.item",
		"type": "message",
		"status": "completed",
		"role": "user",
		"content": [{
			"type": "input_text",
			"transcript": "你好"
		}]
	}
}
会话消息删除响应
type: conversation.item.deleted

当客户端使用 conversation.item.delete 事件删除对话中的项目时返回。此事件用于将服务器对对话历史与客户端的进行同步。

item_id string
会话消息ID
{
    "event_id": "event_bcd",
    "type": "conversation.item.deleted",
    "item_id": "msg_001"
}
用户提交音频的转录结果完成
type: conversation.item.input_audio_transcription.completed

此事件是写入用户音频缓冲区的用户音频的音频转录（ASR）的输出。当客户端commit缓存区的音频，或在server_vad模式下缓冲区音频被提交时，转录开始。转录随响应创建异步运行，因此此事件可能发生在响应事件之前或之后。

item_id string
会话消息ID
content_index int
包含音频内容部分的索引。
transcript string
音频的完整文字内容。
{
    "event_id": "event_2122",
    "type": "conversation.item.input_audio_transcription.completed",
    "item_id": "msg_003",
    "content_index": 0,
    "transcript": "你好"
}
音频内容提交响应
type: input_audio_buffer.committed

当客户端提交输入音频缓冲区时返回。

previous_item_id string
会话前一个消息ID

item_id string
会话消息ID

{
    "event_id": "event_bcd",
    "type": "input_audio_buffer.committed",
    "previous_item_id": "msg_001",
    "item_id": "msg_002"
}
音频内容删除响应
type: input_audio_buffer.cleared

当客户端使用 input_audio_buffer.clear 事件清除输入音频缓冲区时返回。

 
{
    "event_id": "event_1314",
    "type": "input_audio_buffer.cleared"
}
推理有输出项目产生
type: response.output_item.added

在响应生成期间创建新项目时返回。

output_index int
响应中输出项的索引。

item object
输出项的对象。

id string
项目的 ID。

object
始终为realtime.item

type
item类型,目前仅支持 message

status
项目状态,可选值为 completed, incomplete,in_progress

role
该项目的 role， 仅适用于 message 项目，可选值为 user, assistant, system

content
消息的内容，适用于 message 项目。
role=system 的消息项仅支持 input_text 内容
role=user 的消息项支持 input_text 和 input_audio 内容
role=assistant 角色支持文本内容的消息项。

{
    "event_id": "event_3334",
    "type": "response.output_item.added",
    "response_id": "resp_001",
    "output_index": 0,
    "item": {
        "id": "msg_007",
        "object": "realtime.item",
        "type": "message",
        "status": "in_progress",
        "role": "assistant",
        "content": []
    }
}
