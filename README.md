# 🔄 Recurring Task Archiver for Obsidian

<div align="center">

![Obsidian](https://img.shields.io/badge/Obsidian-0.15.0%2B-7C3AED?style=for-the-badge&logo=obsidian&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**Automate your recurring tasks and keep your vault clean**

</div>

---

## English

### ✨ Features

- 🔁 **Automatic Recurrence**: Automatically create next task instance when completing recurring tasks
- 📦 **Smart Archiving**: Archive completed tasks in organized dated folders
- 🔍 **Fuzzy Matching**: Tolerant of typos in recurrence rules (e.g., "weakly" → "weekly")
- 🌐 **Bilingual Support**: Full support for English and Persian (Farsi)
- ⚙️ **Highly Customizable**: 
  - Custom field names
  - Flexible date formats
  - Configurable archive paths
  - Editable recurrence rules
- 🛡️ **Safe & Reliable**:
  - Race condition protection
  - Data validation
  - Error handling with detailed notifications
- 🎯 **Flexible Scheduling**:
  - Daily, Weekly, Monthly, Yearly
  - Custom intervals (e.g., every 2 weeks, every 4 months)
  - Easy to add your own rules

---

### 📦 Installation

#### Method 1: From Obsidian Community Plugins (Recommended)

1. Open **Obsidian Settings**
2. Navigate to **Community Plugins**
3. Click **Browse** and search for **"Recurring Task Archiver"**
4. Click **Install** then **Enable**

#### Method 2: Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/WASP-Outis/recurring-task-archiver/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` to:
   ```
   <your-vault>/.obsidian/plugins/recurring-task-archiver/
   ```
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

---

### 🚀 Quick Start Guide

#### Step 1: Setup Your Task Template

Create a template file (e.g., `Templates/Task.md`):

```yaml
---
completed: false
archived: false
due: 2025-01-15
recurrence: Weekly
created: 2025-01-08
---

# Task Title

## 🎯 Goal
- Your main objective here

## ✅ Subtasks
- [ ] First subtask
- [ ] Second subtask

## 📝 Notes
Your notes here...
```

#### Step 2: Create Your First Recurring Task

1. Use your template to create a task
2. Fill in the details:
   - `completed`: Set to `false` initially
   - `due`: Set the due date (format: `YYYY-MM-DD`)
   - `recurrence`: Choose from:
     - `None` (هیچ)
     - `Daily` (هر روز)
     - `Weekly` (هر هفته)
     - `Every 2 Weeks` (هر 2 هفته)
     - `Monthly` (هر ماه)
     - `Every 4 Months` (هر 4 ماه)
     - `Yearly` (هر سال)

Example:
```yaml
---
completed: false
archived: false
due: 2025-01-15
recurrence: Weekly
created: 2025-01-08
---

# 📅 Weekly Review

## 🎯 Goal
- Review past week and plan next week

## ✅ Subtasks
- [ ] Review calendar
- [ ] Check completed tasks
- [ ] Plan next week priorities
```

#### Step 3: Complete the Task

When you finish the task:

1. Change `completed: false` to `completed: true`
2. **Save the file**
3. A modal will appear asking:
   - **"✅ Yes, Recur & Archive"**: Creates next instance and archives current
   - **"📦 No, Just Archive"**: Only archives without creating next instance
   - **"❌ Cancel"**: Do nothing

**What happens automatically:**
- ✅ New task created for next week (2025-01-22)
- 📦 Current task marked as `archived: true`
- 📁 Current task moved to `Archive/Tasks/2025/01/`
- 🔄 Subtasks in new task are unchecked (if enabled in settings)

---

### ⚙️ Configuration

Navigate to **Settings → Recurring Task Archiver** to customize:

#### 🌐 Language
- Switch between English and فارسی

#### 🔄 Recurrence Rules
Edit or create custom recurrence rules:
- **Amount**: Number of units to add
- **Unit**: day, week, month, or year
- **Enable/Disable**: Toggle rules on/off

Example: Create "Every 3 Days" rule:
- Amount: `3`
- Unit: `day(s)`

#### 📁 File Paths
- **Template File Path**: Your task template location
  - Default: `Templates/Task.md`
- **Archive Folder Path**: Where completed tasks go
  - Default: `Archive/Tasks`
- **Use Dated Folders**: Organize by date (recommended)
  - Creates: `Archive/Tasks/2025/01/`
- **Date Format for Folders**: Customize folder structure
  - Default: `YYYY/MM`
  - Options: `YYYY`, `YYYY-MM`, `YYYY/MM/DD`, etc.

#### ⚡ Behavior
- **Confirm Before Recurring**: Show confirmation modal
  - ✅ Recommended for safety
- **Copy Subtasks**: Copy checkboxes to new task
  - All subtasks will be unchecked in new task

#### 🛠️ Advanced Settings
- **Date Format**: Format for due dates
  - Default: `YYYY-MM-DD`
  - Supports: `DD/MM/YYYY`, `MM-DD-YYYY`, etc.
- **Debounce Delay**: Delay before processing (ms)
  - Default: `1000` (1 second)
  - Prevents multiple triggers on quick saves
- **Max Concurrent Processing**: Simultaneous task limit
  - Default: `3`
  - Range: 1-10

#### 📝 Frontmatter Field Names
Customize field names to match your workflow:
- **Completed Field**: Default `completed`
- **Archived Field**: Default `archived`
- **Due Date Field**: Default `due`
- **Recurrence Field**: Default `recurrence`
- **Created Field**: Default `created`

**Example with custom fields:**
```yaml
---
status: done        # instead of completed
isArchived: false   # instead of archived
deadline: 2025-01-15  # instead of due
repeat: Weekly      # instead of recurrence
dateCreated: 2025-01-08  # instead of created
---
```

Then in settings, set:
- Completed Field → `status`
- Archived Field → `isArchived`
- Due Date Field → `deadline`
- etc.

---

### 🎯 Use Cases & Examples

#### 1️⃣ Daily Habits
```yaml
---
completed: false
recurrence: Daily
due: 2025-01-15
---
# 💪 Morning Exercise
- [ ] 10 push-ups
- [ ] 5 minutes meditation
```

#### 2️⃣ Weekly Reviews
```yaml
---
completed: false
recurrence: Weekly
due: 2025-01-17
---
# 📊 Weekly Review
- [ ] Review accomplishments
- [ ] Plan next week
- [ ] Update goals
```

#### 3️⃣ Monthly Bills
```yaml
---
completed: false
recurrence: Monthly
due: 2025-01-30
---
# 💰 Pay Rent
- [ ] Transfer money
- [ ] Save receipt
```

#### 4️⃣ Quarterly Reports
```yaml
---
completed: false
recurrence: Every 4 Months
due: 2025-04-01
---
# 📈 Quarterly Business Review
- [ ] Analyze metrics
- [ ] Write report
- [ ] Present findings
```

---

### 🔌 Recommended Companion Plugins

This plugin works standalone, but pairs well with:

- **Metadata Menu**: Visual interface for editing frontmatter
  - Makes changing `completed` field easier
  - Dropdown menus for recurrence selection
- **Templater**: Advanced template system
  - Dynamic date insertion
  - Auto-fill fields
- **Dataview**: Query and display tasks
  - Create task dashboards
  - Track completion rates
- **Calendar**: Visual calendar view
  - See due dates at a glance
- **Tasks**: Advanced task management
  - Filter by recurrence
  - Group by due date

**Note**: This plugin does NOT require any other plugins to function!

---

### 🐛 Troubleshooting

#### Issue: Plugin doesn't trigger after marking task complete

**Solution:**
1. Enable Debug Logging in settings
2. Check Developer Console (`Ctrl+Shift+I` or `Cmd+Option+I`)
3. Look for errors
4. Ensure:
   - Field name matches settings (case-sensitive)
   - `completed` is set to `true` (boolean, not string)
   - `recurrence` field has valid value

#### Issue: Wrong date format in new task

**Solution:**
- Check **Date Format** in Advanced Settings
- Ensure it matches your preferred format
- Plugin supports multiple formats automatically:
  - `YYYY-MM-DD` (default)
  - `DD/MM/YYYY`
  - `MM-DD-YYYY`
  - etc.

#### Issue: Tasks not archiving to correct folder

**Solution:**
1. Check **Archive Folder Path** in settings
2. Verify path exists or plugin will create it
3. Check **Use Dated Folders** toggle
4. Verify **Date Format for Folders** matches your preference

#### Issue: Recurrence rule not recognized

**Solution:**
- Plugin uses **fuzzy matching**
- Handles typos: "weakly" → "weekly"
- Accepts English and Persian labels
- Case-insensitive
- If still not working:
  1. Check spelling in frontmatter
  2. Verify rule is enabled in settings
  3. Try exact match: `Daily`, `Weekly`, etc.

#### Issue: Multiple task copies created

**Solution:**
- Increase **Debounce Delay** in Advanced Settings
- Default: 1000ms (1 second)
- Try: 2000ms or higher if issue persists

---

### 🔐 Privacy & Data

- ✅ **100% Local**: All processing happens on your device
- ✅ **No Cloud**: No data sent to external servers
- ✅ **No Tracking**: No analytics or telemetry
- ✅ **Open Source**: Code is fully auditable

---

### 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

#### Development Setup

```bash
# Clone the repository
git clone https://github.com/WASP-Outis/recurring-task-archiver.git
cd recurring-task-archiver

# Install dependencies
npm install

# Start development build (watches for changes)
npm run dev

# Build for production
npm run build
```

---

### 📝 Changelog

#### Version 1.0.0 (2025-01-15)
- 🎉 Initial release
- ✅ Automatic task recurrence
- 📦 Smart archiving with dated folders
- 🔍 Fuzzy matching for recurrence rules
- 🌐 Bilingual support (English/Persian)
- ⚙️ Fully customizable settings
- 🛡️ Race condition protection
- 🎯 Flexible date format support

---

### 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

### 👨‍💻 Author

**Shahryar Sahebekhtiari**

- GitHub: [@WASP-Outis](https://github.com/WASP-Outis)
- Email: Sh1380se@gmail.com

---

### ⭐ Support

If you find this plugin useful:
- ⭐ Star this repository
- 🐛 Report bugs via [Issues](https://github.com/WASP-Outis/recurring-task-archiver/issues)
- 💡 Suggest features
