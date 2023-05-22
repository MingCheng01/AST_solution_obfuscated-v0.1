import execjs
import tkinter as tk
from tkinter import scrolledtext
import tkinter.filedialog
from tkinter.messagebox import showinfo, showwarning, showerror
from tkinter import *


class ob_tools():

    def __init__(self):
        window = tk.Tk()
        window.title('AST解混淆工具-by:Uncle_Ming')
        window.geometry('1280x720')
        self.js_code = ''
        self.compression = 0
        self.environment = 0
        L1 = tk.Label(window, text='原始js', width=7, height=1, justify='left', anchor='w', font=("Times", 15, "bold"))
        L1.place(x=250, y=2)
        # 原始js窗口
        self.Original_scrolled = scrolledtext.ScrolledText(window, width=80, height=50, state=tk.DISABLED)
        self.Original_scrolled.place(x=15, y=30)

        L2 = tk.Label(window, text='AST还原', width=7, height=1, justify='left', anchor='w', font=("Times", 15, "bold"))
        L2.place(x=850, y=2)
        # AST处理窗口
        self.Process_scrolled = scrolledtext.ScrolledText(window, width=80, height=50, state=tk.DISABLED)
        self.Process_scrolled.place(x=600, y=30)

        b1 = tk.Button(window, text='  打开文件 ', command=self.open_read)
        b1.place(x=1188, y=30)

        L3 = tk.Label(window, text='AST功能', width=7, height=1, justify='left', anchor='w', font=("Times", 15, "bold"),
                      fg="DarkBlue")
        L3.place(x=1180, y=65)

        b2 = tk.Button(window, text='大数组混淆', command=self.array_obfuscation)
        b2.place(x=1188, y=100)
        b3 = tk.Button(window, text='字符串拼接', command=self.character_concatenation)
        b3.place(x=1188, y=140)
        b4 = tk.Button(window, text='字符串混淆', command=self.character_confusion)
        b4.place(x=1188, y=180)
        b5 = tk.Button(window, text='多括号嵌套', command=self.parentheses_are_nested)
        b5.place(x=1188, y=220)
        b6 = tk.Button(window, text='if判断剔除 ', command=self.if_obfuscated)
        b6.place(x=1188, y=260)
        b7 = tk.Button(window, text='运算符还原', command=self.operator_confusion)
        b7.place(x=1188, y=300)
        b8 = tk.Button(window, text='逗号表达式', command=self.remove_comma)
        b8.place(x=1188, y=340)
        b9 = tk.Button(window, text='去除花指令', command=self.flower_instructions)
        b9.place(x=1188, y=380)
        b10 = tk.Button(window, text='控制平坦化', command=self.control_flattening)
        b10.place(x=1188, y=420)

        L4 = tk.Label(window, text='代码 压缩', width=7, height=1, justify='left', anchor='w', font=("Times", 15, "bold"),
                      fg="DarkBlue")
        L4.place(x=1180, y=460)

        b11 = tk.Button(window, text=' 轻度-压缩 ', command=self.mild_compression)
        b11.place(x=1188, y=500)
        b12 = tk.Button(window, text=' 重度-压缩 ', command=self.heavy_compression)
        b12.place(x=1188, y=540)

        L5 = tk.Label(window, text='   其  它', width=7, height=1, justify='left', anchor='w', font=("Times", 15, "bold"),
                      fg="DarkBlue")
        L5.place(x=1180, y=575)
        b14 = tk.Button(window, text='一键补环境', command=self.make_up_the_environment)
        b14.place(x=1188, y=610)

        L6 = tk.Label(window, text='代码 保存', width=7, height=1, justify='left', anchor='w', font=("Times", 15, "bold"),
                      fg="DarkBlue")
        L6.place(x=1180, y=645)

        b13 = tk.Button(window, text='  js另存为 ', command=self.file_save)
        b13.place(x=1188, y=680)

        L7 = tk.Label(window, text='日志：', width=7, height=1, justify='left', anchor='w', font=("Times", 15, "bold"))
        L7.place(x=10, y=690)
        self.L8 = tk.Label(window, text='', width=95, height=1, justify='left', anchor='w', font=("Times", 15))
        self.L8.place(x=70, y=690)
        window.mainloop()

    def updata_text(self, scrolled, text):
        # pass
        if scrolled == 'Original':
            self.Original_scrolled.config(state='normal')
            self.Original_scrolled.delete(1.0, 'end')
            self.Original_scrolled.insert(END, text + '\n')
            self.Original_scrolled.config(state=tk.DISABLED)
            self.Original_scrolled.update()
        else:
            self.Process_scrolled.config(state='normal')
            self.del_text()
            self.Process_scrolled.insert(END, text + '\n')
            self.Process_scrolled.config(state=tk.DISABLED)
            self.Process_scrolled.update()

    def pop_ups(self, type_, text):
        if type_ == 'info':
            showinfo(title="提示", message=text)
        elif type_ == 'warning':
            showwarning(title="警告", message=text)
        elif type_ == 'error':
            showerror(title="错误", message=text)
        else:
            showinfo(title="提示", message=text)

    def del_text(self):
        self.Process_scrolled.delete(1.0, 'end')

    def open_read(self):
        path_ = tk.filedialog.askopenfilename()
        try:
            if path_.split('.')[-1] != 'js' and path_ != '':
                self.pop_ups('info', text='目前仅支持读取js文件！')
            elif path_ == '':
                pass
            else:
                with open(path_, 'r', encoding='utf-8') as f:
                    self.js_code = f.read()
                    self.updata_text(scrolled='Original', text=self.js_code)
                    self.del_text()
                    self.compression = 0
                    self.environment = 0
        except Exception as e:
            self.pop_ups(type_='error', text=str(e))

    def open_ast_js(self, path_):
        try:
            with open(path_, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            self.pop_ups(type_='error', text="初始化AST_js文件出现问题: " + str(e))

    def log_(self, text, type_):
        if type_ == 'success':
            self.L8.config(text=text, fg="chartreuse4")
            self.L8.update()
        else:
            self.L8.config(text=text, fg="DarkRed")
            self.L8.update()

    def array_obfuscation(self):
        try:
            ast_code = self.open_ast_js(path_='./AST/AST大数组加密解混淆.js')
            ast_code = execjs.compile(ast_code)
            self.js_code = ast_code.call('Large_array_encryption', self.js_code)
            self.log_('AST大数组加密解混淆-成功！', type_='success')
            self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.log_('AST大数组加密解混淆-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def character_concatenation(self):
        try:
            ast_code = self.open_ast_js(path_='./AST/AST字符串拼接还原.js')
            ast_code = execjs.compile(ast_code)
            self.js_code = ast_code.call('String_concatenation', self.js_code)
            self.log_('AST字符串拼接还原-成功！', type_='success')
            self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.log_('AST字符串拼接还原-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def character_confusion(self):
        try:
            ast_code = self.open_ast_js(path_='./AST/AST字符串混淆.js')
            ast_code = execjs.compile(ast_code)
            self.js_code = ast_code.call('String_obfuscation', self.js_code)
            self.log_('AST字符串解混淆-成功！', type_='success')
            self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.log_('AST字符串解混淆-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def parentheses_are_nested(self):
        try:
            ast_code = self.open_ast_js(path_='./AST/AST解除中括号嵌套.js')
            ast_code = execjs.compile(ast_code)
            self.js_code = ast_code.call('Parentheses_are_nested', self.js_code)
            self.log_('AST解除中括号嵌套-成功！', type_='success')
            self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.log_('AST解除中括号嵌套-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def if_obfuscated(self):
        try:
            ast_code = self.open_ast_js(path_='./AST/AST移除if语句混淆.js')
            ast_code = execjs.compile(ast_code)
            self.js_code = ast_code.call('If_obfuscated', self.js_code)
            self.log_('AST移除if语句混淆-成功！', type_='success')
            self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.log_('AST移除if语句混淆-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def operator_confusion(self):
        try:
            ast_code = self.open_ast_js(path_='./AST/AST运算符混淆还原.js')
            ast_code = execjs.compile(ast_code)
            self.js_code = ast_code.call('Operator_confusion', self.js_code)
            self.log_('AST运算符混淆还原-成功！', type_='success')
            self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.log_('AST运算符混淆还原-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def remove_comma(self):
        try:
            ast_code = self.open_ast_js(path_='./AST/AST去除逗号表达式.js')
            ast_code = execjs.compile(ast_code)
            self.js_code = ast_code.call('Remove_comma', self.js_code)
            self.log_('AST去除逗号表达式-成功！', type_='success')
            self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.log_('AST去除逗号表达式-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def flower_instructions(self):
        try:
            t = ''
            ast_code = self.open_ast_js(path_='./AST/AST花指令剔除.js')
            ast_code = execjs.compile(ast_code)
            try:
                self.js_code = ast_code.call('Flower_instructions1', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
                t += 'AST花指令剔除方法1-成功！ '
            except:
                t += 'AST花指令剔除方法2-失败！ '
            try:
                self.js_code = ast_code.call('Flower_instructions2', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
                t += 'AST花指令剔除方法2-成功！ '
            except:
                t += 'AST花指令剔除方法2-失败！ '
            try:
                self.js_code = ast_code.call('Flower_instructions3', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
                t += 'AST花指令剔除方法3-成功！ '
            except:
                t += 'AST花指令剔除方法3-失败！ '
            try:
                self.js_code = ast_code.call('Flower_instructions4', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
                t += 'AST花指令剔除方法4-成功！'
            except:
                t += 'AST花指令剔除方法4-失败！'
            if '失败' not in t:
                self.log_(t, type_='success')
            else:
                self.log_(t, type_='error')

        except Exception as e:
            self.log_('AST花指令剔除-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def control_flattening(self):
        try:
            t = ''
            ast_code = self.open_ast_js(path_='./AST/AST控制流平坦化.js')
            ast_code = execjs.compile(ast_code)
            try:
                self.js_code = ast_code.call('Control_leveling1', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
                t += 'AST控制流平坦化方法1-成功！ '
            except:
                t += 'AST控制流平坦化方法1-失败！ '
                pass
            try:
                self.js_code = ast_code.call('Control_leveling2', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
                t += 'AST控制流平坦化方法2-成功！ '
            except:
                t += 'AST控制流平坦化方法1-失败！ '
            try:
                self.js_code = ast_code.call('Control_leveling3', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
                t += 'AST控制流平坦化方法3-成功！'
            except:
                t += 'AST控制流平坦化方法1-失败！'
            if '失败' not in t:
                self.log_(t, type_='success')
            else:
                self.log_(t, type_='error')
        except Exception as e:
            self.log_('AST控制流平坦化-失败！', type_='error')
            self.pop_ups(type_='error', text=str(e))

    def mild_compression(self):
        try:
            if self.compression == 1:
                self.updata_text(scrolled='Process', text='重度压缩后不支持再次轻度压缩！\n会出问题哒')
            else:
                ast_code = self.open_ast_js(path_='./AST/AST轻度压缩.js')
                ast_code = execjs.compile(ast_code)
                self.js_code = ast_code.call('Mild_compression', self.js_code)
                self.updata_text(scrolled='Process', text=self.js_code)
        except Exception as e:
            self.pop_ups(type_='error', text=str(e))

    def heavy_compression(self):
        try:
            if self.compression == 1:
                self.updata_text(scrolled='Process', text='重度压缩了怎么还要再压缩？\n会出问题哒')
            else:
                ast_code = self.open_ast_js(path_='./AST/AST重度压缩.js')
                ast_code = execjs.compile(ast_code)
                self.js_code = ast_code.call('Heavy_compression', self.js_code)
                self.updata_text(scrolled='Process', text='重度压缩显示会导致tk严重卡顿\n当您看到这句话时说明压缩已经结束，可以执行保存')
                self.compression = 1
        except Exception as e:
            self.pop_ups(type_='error', text=str(e))

    def file_save(self):
        try:
            path_ = tkinter.filedialog.asksaveasfilename(title='保存js', initialfile='out.js')
            if path_ != '':
                with open(path_, 'w', encoding='utf-8') as f:
                    f.write(self.js_code)
            else:
                pass
        except Exception as e:
            self.pop_ups(type_='error', text=str(e))

    def make_up_the_environment(self):
        str_ = "const jsdom=require('jsdom')\nconst { JSDOM } =jsdom\nconst dom=new JSDOM('<!doctype html><p> hello </p>')\nwindow=dom.window\ndocument=window.document\nnavigator=window.navigator\n"
        if self.js_code != '' and self.environment == 0:
            self.js_code = str_ + self.js_code
            self.updata_text(scrolled='Process', text=self.js_code)


tools = ob_tools()
