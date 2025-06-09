# 导出的文章数据结构说明

本文档旨在说明导出的旅游美食攻略数据的目录结构、Markdown 文件内容格式以及图片如何与文章关联。

## 一、目录结构

导出的数据以一个根目录（例如 `exported_data`）开始，内部按以下结构组织：
[导出根目录]/
├── [文章类型]/ 例如: food/ 或 guide/
│ └── [国家名称或Slug]/ 例如: japan/ 或 south-korea/
│ └── [文章唯一标识符]/ 例如: an-amazing-trip-to-tokyo/ 或 article-123/
│ ├── [文章Markdown文件].md 例如: index.md 或 an-amazing-trip-to-tokyo.md
│ ├── [图片1文件名].jpg 例如: pic_1.jpg, title-image.jpg
│ ├── [图片2文件名].png
│ └── ... (更多图片)
└── ... (其他类型和国家)


**解释：**

*   **`[导出根目录]`**: 包含所有导出数据的顶层文件夹。
*   **`[文章类型]`**: 代表文章的分类，目前主要有：
    *   `food`: 美食相关的攻略。
    *   `guide`: 旅行指南相关的攻略。
*   **`[国家名称或Slug]`**: 代表文章所属的国家。通常是国家名称的小写形式，用连字符 `-` 代替空格（例如 `south-korea`）。
*   **`[文章唯一标识符]`**: 每个文件夹代表一篇独立的文章。这个文件夹的名称通常是文章的 URL Slug（例如 `an-amazing-trip-to-tokyo`），或者是基于文章数据库 ID 的一个唯一名称（例如 `article-123`）。
*   **`[文章Markdown文件].md`**: 在每个文章文件夹内，有一个 `.md` 文件（通常命名为 `index.md` 或与文件夹同名），包含了该文章的元数据和正文内容。
*   **`[图片文件名]`**: 同一个文章文件夹内，还包含了该文章引用的所有图片文件（例如 `.jpg`, `.png` 等）。

## 二、Markdown 文件内容格式

每篇攻略的 `.md` 文件由两部分组成：**Front Matter (元数据)** 和 **Markdown 正文**。

### 1. Front Matter

Front Matter 位于文件的最顶部，由两行三个连字符 (`---`) 包裹。它使用 YAML 格式定义了文章的元数据。

**主要字段及其含义：**

*   `title`: (字符串，必需) 文章的标题。
    *   示例: `title: "Exploring the Streets of Kyoto"`
*   `date`: (日期，必需) 文章的原始创建日期或发布日期，格式为 `YYYY-MM-DD`。
    *   示例: `date: "2024-05-15"`
*   `categories`: (字符串，必需) 文章所属的国家/地区名称。
    *   示例: `categories: "Japan"`
*   `type`: (字符串，必需) 文章的类型，可选值为：
    *   `guide`: 表示旅行指南。
    *   `food`: 表示美食攻略。
    *   示例: `type: "guide"`
*   `author`: (字符串，可选) 文章作者的用户名。
    *   示例: `author: "TravelerJohn"`
*   `titleImage`: (字符串，可选) 指定作为文章主图或封面图的**图片文件名** (相对于当前 `.md` 文件的路径)。通常是 `pic_1.jpg` 或 `title-image.jpg`。如果文章没有主图，此字段可能不存在。
    *   示例: `titleImage: "pic_1.jpg"`
*   `draft`: (布尔值，固定为 `false`) 表示文章是已发布状态。
    *   示例: `draft: false`

**Front Matter 示例：**

```yaml
---
title: "A Culinary Journey Through Osaka"
date: "2025-03-10"
categories: "Japan"
type: "food"
author: "FoodieExplorer"
titleImage: "title-image.jpg"
draft: false
---

2. Markdown 正文
在第二个 --- 分隔符之后，是文章的正文内容。这部分内容使用标准的 Markdown 语法编写。

图片引用:

文章正文中和 Front Matter 之后（如果作为图集）的图片，通过标准的 Markdown 图片链接语法引用，并且文件名是相对于当前 .md 文件所在目录的相对路径。

示例：
This is the main content of the article. You can find amazing street food here.

The Dotonbori area is a must-see:
![Dotonbori Canal](pic_1.jpg)

Another great spot is Kuromon Market.
![Kuromon Market Stall](pic_2.png)

...更多内容...

---
title: "A Culinary Journey Through Osaka"
date: "2025-03-10"
categories: "Japan"
type: "food"
author: "FoodieExplorer"
titleImage: "title-image.jpg"
draft: false
---

This is the main content of the article. You can find amazing street food here.

The Dotonbori area is a must-see:
![pic_1.jpg](pic_1.jpg)

Another great spot is Kuromon Market.
![pic_2.png](pic_2.png)

...更多内容...

![pic_1.jpg](pic_1.jpg)
![pic_2.png](pic_2.png)
![another_image.jpg](another_image.jpg)

(注意: 在实际导出的文件中，图片链接会放在 Markdown 正文之后，作为图集的一部分)

三、图片与文章的关联
主图/封面图: 通过 Front Matter 中的 titleImage 字段指定。该字段的值是图片的文件名，这个图片文件应该与 .md 文件在同一个文章文件夹内。

其他图片: 文章文件夹内所有 .jpg, .png, .gif 等图片文件都属于该文章。它们在 .md 文件末尾通过 Markdown 图片链接 ![图片描述](图片文件名) 的形式列出，或者直接嵌入在 Markdown 正文内容中。图片文件名是相对于 .md 文件的。

四、数据使用建议
解析 .md 文件时，可以使用 gray-matter 或类似的库来分离 Front Matter 和 Markdown 正文。

Front Matter 可以用于提取文章的元数据。

Markdown 正文可以使用 Markdown 解析库（如 marked, showdown）转换为 HTML 以便在网页上显示。

图片文件与 .md 文件在同一目录下，方便通过相对路径引用和展示。

希望这份说明能帮助你们顺利使用导出的数据！